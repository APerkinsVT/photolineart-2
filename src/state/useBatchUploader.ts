import { nanoid } from 'nanoid';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  PhotoItem,
  PhotoItemEvent,
  PhotoItemMetricKey,
} from '../types/photo';
import type { ManifestItem } from '../types/manifest';
import { downscaleImageFile } from '../utils/imageDownscale';
import { requestUploadTarget, uploadFileToBlob } from '../services/blobService';
import { generateLineArt } from '../services/aiService';
import type { LineArtAnalysis } from '../types/ai';
import {
  initPortal,
  type PortalInfo,
  updatePortalManifest,
  createBundle,
} from '../services/portalService';
import { enhanceTips } from '../services/tipEnhancerService';
import type {
  DiagnosticsSummary,
  PipelineDiagnostics,
  PublishDiagnostics,
} from '../types/diagnostics';

const MAX_FILE_BYTES = 10_000_000;
const MAX_BATCH_BYTES = 80_000_000;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const PROCESSING_CONCURRENCY = 2;
const WATCHDOG_INTERVAL_MS = 10_000;
const PROCESSING_TIMEOUT_MS = 90_000;
const UPLOADED_STALE_MS = 12_000;
const EVENT_HISTORY_LIMIT = 12;

interface AddFilesResult {
  accepted: number;
  rejected: number;
  errors: string[];
}

type UploadOutcome = {
  success: boolean;
  error?: string;
};

function createEvent(message: string, kind: PhotoItemEvent['kind'] = 'info') {
  return {
    id: nanoid(),
    message,
    timestamp: Date.now(),
    kind,
  };
}

export function useBatchUploader(options?: { email?: string; context?: 'single' | 'book' }) {
  const email = options?.email ?? '';
  const context = options?.context ?? 'book';
  const [items, setItems] = useState<PhotoItem[]>([]);
  const [portal, setPortal] = useState<PortalInfo | null>(null);
  const [bundle, setBundle] = useState<{ id: string; portalUrl: string; manifestUrl: string } | null>(
    null,
  );
  const [isPublishing, setIsPublishing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [publishStats, setPublishStats] = useState<PublishDiagnostics>({ status: 'idle' });
  const [setSize, setSetSize] = useState<number>(120);
  const fileStoreRef = useRef(new Map<string, File>());
  const processingSetRef = useRef(new Set<string>());
  const itemsRef = useRef<PhotoItem[]>([]);
  const portalPromiseRef = useRef<Promise<PortalInfo> | null>(null);

  itemsRef.current = items;

  const ensurePortal = useCallback(async () => {
    if (portal) {
      return portal;
    }
    if (!portalPromiseRef.current) {
      portalPromiseRef.current = initPortal().then((result) => {
        setPortal(result);
        return result;
      });
    }
    return portalPromiseRef.current;
  }, [portal]);

  const collectReadyItems = useCallback((): ManifestItem[] => {
    return itemsRef.current
      .filter((item) => item.state === 'ready' && item.blobUrl && item.lineArtUrl && item.analysis)
      .map((item) => ({
        title: formatTitle(item.fileName),
        originalUrl: (item.referenceUrl ?? item.blobUrl) as string,
        lineArtUrl: item.lineArtUrl as string,
        palette: item.analysis?.palette ?? [],
        tips: item.analysis?.tips ?? [],
        setSize: item.analysis?.paletteSetSize ?? 120,
      }));
  }, []);

  const notifyError = useCallback((message: string, error?: unknown) => {
    console.error(message, error);
    setLastError(message);
  }, []);

  const syncPortalManifest = useCallback(async () => {
    try {
      const readyItems = collectReadyItems();
      if (readyItems.length === 0) {
        return;
      }
      const portalInfo = await ensurePortal();
      const model =
        itemsRef.current.find((item) => item.analysis?.model)?.analysis?.model ?? undefined;
      await runWithRetry(
        () =>
          updatePortalManifest({
            id: portalInfo.id,
            portalUrl: portalInfo.portalUrl,
            qrPngUrl: portalInfo.qrPngUrl,
            items: readyItems,
            model,
          }),
        notifyError,
        { label: 'Portal manifest sync' },
      );
    } catch (error) {
      notifyError('Failed to sync portal manifest.', error);
    }
  }, [collectReadyItems, ensurePortal, notifyError]);

  const totalOriginalBytes = useMemo(
    () => items.reduce((acc, item) => acc + item.originalSize, 0),
    [items],
  );

  const updateItem = useCallback(
    (
      id: string,
      patch: Partial<PhotoItem>,
      options?: {
        event?: string;
        eventKind?: PhotoItemEvent['kind'];
        metric?: PhotoItemMetricKey;
      },
    ) => {
      setItems((prev) => {
        const next = prev.map((item) => {
          if (item.id !== id) {
            return item;
          }
          const updated: PhotoItem = {
            ...item,
            ...patch,
            lastUpdated: Date.now(),
            events: item.events ?? [],
            metrics: item.metrics ?? {},
          };
          if (options?.metric) {
            updated.metrics = {
              ...updated.metrics,
              [options.metric]: Date.now(),
            };
          }
          if (options?.event) {
            const events = [...(updated.events ?? []), createEvent(options.event, options.eventKind)];
            if (events.length > EVENT_HISTORY_LIMIT) {
              events.splice(0, events.length - EVENT_HISTORY_LIMIT);
            }
            updated.events = events;
          }
          return updated;
        });
        itemsRef.current = next;
        return next;
      });
    },
    [],
  );

  const ensureItemExists = useCallback(
    (id: string, file: File, previewUrl?: string) => {
      setItems((prev) => {
        const already = prev.find((item) => item.id === id);
        if (already) {
          if (previewUrl && !already.previewUrl) {
            const next = prev.map((item) =>
              item.id === id ? { ...item, previewUrl } : item,
            );
            itemsRef.current = next;
            return next;
          }
          return prev;
        }
        const now = Date.now();
        const next: PhotoItem = {
          id,
          fileName: file.name,
          originalSize: file.size,
          preparedSize: file.size,
          mimeType: file.type,
          progress: 0,
          previewUrl,
          blobUrl: undefined,
          uploadUrl: undefined,
          state: 'preparing',
          error: undefined,
          lastUpdated: now,
          metrics: { queuedAt: now },
          events: [createEvent('Queued for upload')],
        };
        const updated = [next, ...prev];
        itemsRef.current = updated;
        return updated;
      });
    },
    [],
  );

  const applyAiResult = useCallback(
    (id: string, result: { lineArtUrl: string; analysis: LineArtAnalysis }) => {
      updateItem(
        id,
        {
          state: 'ready',
          lineArtUrl: result.lineArtUrl,
          analysis: result.analysis,
          referenceUrl: result.analysis.sourceImageUrl,
          error: undefined,
        },
        {
          event: 'AI finished. Ready for download.',
          eventKind: 'success',
          metric: 'readyAt',
        },
      );
      void ensurePortal();
      void syncPortalManifest();
    },
    [ensurePortal, syncPortalManifest, updateItem],
  );

  const runAiForItem = useCallback(
    async (id: string) => {
      const current = itemsRef.current.find((item) => item.id === id);
      if (!current || !current.blobUrl) {
        updateItem(
          id,
          { error: 'Missing uploaded image for processing.' },
          { event: 'Missing uploaded image for processing.', eventKind: 'error' },
        );
        return;
      }

      updateItem(
        id,
        { state: 'processing', error: undefined },
        { event: 'Sending to Replicate + OpenAI…', metric: 'processingStartedAt' },
      );
      try {
        if (!email) {
          throw new Error('Missing email for AI processing.');
        }
        const response = await runWithRetry(
          () =>
            generateLineArt({
              imageUrl: current.blobUrl as string,
              email,
              context,
              options: { setSize },
            }),
          notifyError,
          { label: `Line art (${current.fileName})` },
        );
        if (response.status === 'no_credits') {
          throw new Error('No credits available for processing.');
        }
        const lineArtUrl = response.lineArtUrl;
        const analysis = response.analysis;
        if (!lineArtUrl || !analysis) {
          throw new Error('Line art response missing required data.');
        }
        applyAiResult(id, { lineArtUrl, analysis });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'AI processing failed';
        updateItem(
          id,
          { state: 'error', error: message },
          { event: `AI processing failed: ${message}`, eventKind: 'error', metric: 'errorAt' },
        );
        notifyError('Line art generation failed. Please retry.', error);
      }
    },
    [applyAiResult, context, email, notifyError, setSize, updateItem],
  );

  const queueProcessing = useCallback(() => {
    setTimeout(() => {
      const active = processingSetRef.current.size;
      if (active >= PROCESSING_CONCURRENCY) {
        return;
      }
      const available = PROCESSING_CONCURRENCY - active;
      const candidates = itemsRef.current.filter(
        (item) => item.state === 'uploaded' && !processingSetRef.current.has(item.id),
      );
      candidates.slice(0, available).forEach((candidate) => {
        processingSetRef.current.add(candidate.id);
        void runAiForItem(candidate.id).finally(() => {
          processingSetRef.current.delete(candidate.id);
          queueProcessing();
        });
      });
    }, 0);
  }, [runAiForItem]);

  useEffect(() => {
    queueProcessing();
  }, [items, queueProcessing]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const interval = window.setInterval(() => {
      const now = Date.now();
      let kicked = false;
      itemsRef.current.forEach((item) => {
        if (item.state === 'processing' && now - item.lastUpdated > PROCESSING_TIMEOUT_MS) {
          console.warn(`[watchdog] Resetting stalled item ${item.id}`);
          processingSetRef.current.delete(item.id);
          updateItem(
            item.id,
            { state: 'uploaded', error: undefined },
            { event: 'Processing stalled. Re-queued for AI.', eventKind: 'error' },
          );
          kicked = true;
        } else if (
          item.state === 'uploaded' &&
          now - item.lastUpdated > UPLOADED_STALE_MS &&
          !processingSetRef.current.has(item.id)
        ) {
          kicked = true;
        }
      });
      if (kicked) {
        queueProcessing();
      }
    }, WATCHDOG_INTERVAL_MS);
    return () => {
      window.clearInterval(interval);
    };
  }, [queueProcessing, updateItem]);

  const processFile = useCallback(
    async (file: File, existingId?: string): Promise<UploadOutcome> => {
      const id = existingId ?? nanoid();
      const previewUrl = existingId ? undefined : URL.createObjectURL(file);
      ensureItemExists(id, file, previewUrl);
      fileStoreRef.current.set(id, file);

      try {
        updateItem(
          id,
          {
            fileName: file.name,
            originalSize: file.size,
            preparedSize: file.size,
            mimeType: file.type,
            state: 'preparing',
            progress: 0,
            error: undefined,
          },
          { event: 'Preparing image (downscaling oversized files as needed)…', metric: 'preparingStartedAt' },
        );

        const { file: preparedFile, didChange } = await downscaleImageFile(file, {
          maxBytes: MAX_FILE_BYTES,
          maxDimension: 3200,
        });

        if (didChange) {
          fileStoreRef.current.set(id, preparedFile);
          updateItem(id, {
            preparedSize: preparedFile.size,
            mimeType: preparedFile.type,
          });
        }

        const uploadTarget = await runWithRetry(
          () =>
            requestUploadTarget({
              contentType: preparedFile.type,
              sizeBytes: preparedFile.size,
            }),
          notifyError,
          { label: `Upload target (${file.name})` },
        );

        updateItem(
          id,
          {
            state: 'uploading',
            uploadUrl: uploadTarget.uploadUrl,
          },
          { event: 'Uploading to Vercel Blob…', metric: 'uploadStartedAt' },
        );

        const blobUrl = await runWithRetry(
          () =>
            uploadFileToBlob(preparedFile, uploadTarget, (progress) => {
              updateItem(id, {
                progress: Math.min(100, Math.round(progress.percentage)),
              });
            }),
          notifyError,
          { label: `Blob upload (${file.name})`, attempts: 2 },
        );

        updateItem(
          id,
          {
            state: 'uploaded',
            blobUrl,
            progress: 100,
          },
          { event: 'Upload complete. Waiting for AI queue…', metric: 'uploadCompletedAt' },
        );

        queueProcessing();

        return { success: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Upload failed';
        updateItem(
          id,
          {
            state: 'error',
            error: message,
          },
          { event: `Upload failed: ${message}`, eventKind: 'error', metric: 'errorAt' },
        );
        notifyError('Image upload failed. Please retry.', error);
        return { success: false, error: message };
      }
    },
    [ensureItemExists, notifyError, queueProcessing, updateItem],
  );

  const addFiles = useCallback(
    async (input: FileList | File[]): Promise<AddFilesResult> => {
      const files = Array.from(input);
      const result: AddFilesResult = { accepted: 0, rejected: 0, errors: [] };
      let projected = totalOriginalBytes;

      for (const file of files) {
        if (!ALLOWED_TYPES.includes(file.type)) {
          result.rejected += 1;
          result.errors.push(`${file.name} is not a supported format.`);
          continue;
        }
        if (projected + file.size > MAX_BATCH_BYTES) {
          result.rejected += 1;
          result.errors.push(
            `${file.name} would push the batch over the ${MAX_BATCH_BYTES / 1_000_000}MB limit.`,
          );
          continue;
        }
        projected += file.size;
        result.accepted += 1;
        void processFile(file);
      }

      return result;
    },
    [processFile, totalOriginalBytes],
  );

  const retryItem = useCallback(
    async (id: string) => {
      const file = fileStoreRef.current.get(id);
      const current = itemsRef.current.find((item) => item.id === id);
      if (current?.blobUrl && current.state === 'error') {
        updateItem(
          id,
          { state: 'uploaded', error: undefined },
          { event: 'Retry requested. Back in queue for AI.', eventKind: 'info' },
        );
        queueProcessing();
        return;
      }
      if (!file) {
        updateItem(
          id,
          { error: 'Original file unavailable for retry.' },
          { event: 'Original file unavailable for retry.', eventKind: 'error' },
        );
        return;
      }
      await processFile(file, id);
    },
    [processFile, queueProcessing, updateItem],
  );

  const removeItem = useCallback((id: string) => {
    fileStoreRef.current.delete(id);
    processingSetRef.current.delete(id);
    setItems((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      const next = prev.filter((item) => item.id !== id);
      itemsRef.current = next;
      return next;
    });
    void syncPortalManifest();
  }, [syncPortalManifest]);

  const publishBundle = useCallback(async () => {
    const manifestItems = collectReadyItems();
    if (manifestItems.length === 0) {
      notifyError('No processed items to publish.');
      return;
    }
    const portalInfo = await ensurePortal();
    const model =
      itemsRef.current.find((item) => item.analysis?.model)?.analysis?.model ?? undefined;
    setIsPublishing(true);
    const publishStartedAt = Date.now();
    setPublishStats({
      status: 'running',
      startedAt: publishStartedAt,
      itemCount: manifestItems.length,
      tipEnhancementFailures: 0,
    });
    let tipEnhancementFailures = 0;
    try {
      let enhancedItems = manifestItems;
      try {
        const result = await runWithRetry(
          () => enhanceTips(manifestItems),
          notifyError,
          { label: 'Tip enhancement', attempts: 2 },
        );
        if (result?.items) {
          const partialFailures = result.items.filter((item) => item.enhancementError);
          if (partialFailures.length > 0) {
            const message = `Tip enhancement had issues for ${partialFailures.length} photo(s). Using base tips for those entries.`;
            notifyError(message);
            tipEnhancementFailures = partialFailures.length;
          }
          enhancedItems = result.items.map((item) => {
            const rest = { ...item } as Omit<typeof item, 'enhancementError'> & {
              enhancementError?: unknown;
            };
            delete rest.enhancementError;
            return rest;
          });
        }
      } catch (error) {
        console.warn('Tip enhancement failed', error);
      }

      await runWithRetry(
        () =>
          updatePortalManifest({
            id: portalInfo.id,
            portalUrl: portalInfo.portalUrl,
            qrPngUrl: portalInfo.qrPngUrl,
            items: enhancedItems,
            model,
          }),
        notifyError,
        { label: 'Portal manifest sync' },
      );

      const response = await runWithRetry(
        () =>
          createBundle({
            id: portalInfo.id,
            portalUrl: portalInfo.portalUrl,
            qrPngUrl: portalInfo.qrPngUrl,
            items: enhancedItems,
            model,
          }),
        notifyError,
        { label: 'Bundle publish' },
      );
      setBundle(response);
      setPublishStats({
        status: 'success',
        startedAt: publishStartedAt,
        finishedAt: Date.now(),
        durationMs: Date.now() - publishStartedAt,
        itemCount: manifestItems.length,
        tipEnhancementFailures,
      });
    } catch (error) {
      setPublishStats({
        status: 'error',
        startedAt: publishStartedAt,
        finishedAt: Date.now(),
        durationMs: Date.now() - publishStartedAt,
        itemCount: manifestItems.length,
        tipEnhancementFailures,
        error: error instanceof Error ? error.message : 'Publish failed',
      });
      throw error;
    } finally {
      setIsPublishing(false);
    }
  }, [collectReadyItems, ensurePortal, notifyError]);

  const stats = useMemo(() => {
    const uploading = items.filter((item) => item.state === 'uploading' || item.state === 'preparing');
    const processing = items.filter((item) => item.state === 'processing');
    const ready = items.filter((item) => item.state === 'ready');
    const failed = items.filter((item) => item.state === 'error');
    return {
      total: items.length,
      uploading: uploading.length,
      processing: processing.length,
      ready: ready.length,
      failed: failed.length,
      totalBytes: totalOriginalBytes,
    };
  }, [items, totalOriginalBytes]);

  const isBusy = useMemo(
    () =>
      items.some(
        (item) => item.state === 'preparing' || item.state === 'uploading' || item.state === 'processing',
      ),
    [items],
  );

  const diagnostics = useMemo<DiagnosticsSummary>(
    () => ({
      pipeline: computePipelineDiagnostics(items),
      publish: publishStats,
    }),
    [items, publishStats],
  );

  return {
    items,
    addFiles,
    retryUpload: retryItem,
    removeItem,
    stats,
    isBusy,
    portal,
    bundle,
    isPublishing,
    publishBundle,
    lastError,
    clearError: () => setLastError(null),
    setSize,
    setSetSize,
    diagnostics,
  };
}

function formatTitle(fileName: string) {
  const withoutExt = fileName.replace(/\.[^/.]+$/, '');
  return withoutExt
    .split(/[-_ ]+/)
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(' ');
}

function computePipelineDiagnostics(items: PhotoItem[]): PipelineDiagnostics {
  const totalItems = items.length;
  const completedItems = items.filter((item) => Boolean(item.metrics?.readyAt)).length;

  const prepDurations: Array<number | undefined> = [];
  const uploadDurations: Array<number | undefined> = [];
  const aiDurations: Array<number | undefined> = [];

  items.forEach((item) => {
    const metrics = item.metrics;
    if (!metrics) {
      return;
    }
    const prepStart = metrics.preparingStartedAt ?? metrics.queuedAt;
    const prepEnd = metrics.uploadStartedAt ?? metrics.uploadCompletedAt;
    prepDurations.push(durationMs(prepStart, prepEnd));
    uploadDurations.push(durationMs(metrics.uploadStartedAt, metrics.uploadCompletedAt));
    aiDurations.push(durationMs(metrics.processingStartedAt, metrics.readyAt));
  });

  return {
    totalItems,
    completedItems,
    avgPrepMs: average(prepDurations),
    avgUploadMs: average(uploadDurations),
    avgAiMs: average(aiDurations),
  };
}

function durationMs(start?: number, end?: number) {
  if (!start || !end) {
    return undefined;
  }
  return Math.max(0, end - start);
}

function average(values: Array<number | undefined>) {
  const valid = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  if (valid.length === 0) {
    return undefined;
  }
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

interface RetryOptions {
  attempts?: number;
  label?: string;
}

async function runWithRetry<T>(
  operation: () => Promise<T>,
  notify: (message: string, error?: unknown) => void,
  options?: RetryOptions,
) {
  const attempts = options?.attempts ?? 3;
  const label = options?.label ?? 'Operation';
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < attempts - 1) {
        notify(`${label}: attempt ${attempt + 1} failed. Retrying...`, error);
        await new Promise((resolve) => setTimeout(resolve, (attempt + 1) * 500));
      }
    }
  }
  notify(`${label}: failed after ${attempts} attempts.`, lastError);
  throw lastError;
}
