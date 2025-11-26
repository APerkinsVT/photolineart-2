import type { LineArtAnalysis } from './ai';

export type PhotoItemEventKind = 'info' | 'success' | 'error';

export interface PhotoItemEvent {
  id: string;
  message: string;
  timestamp: number;
  kind: PhotoItemEventKind;
}

export type PhotoItemMetricKey =
  | 'queuedAt'
  | 'preparingStartedAt'
  | 'uploadStartedAt'
  | 'uploadCompletedAt'
  | 'processingStartedAt'
  | 'readyAt'
  | 'errorAt';

export type PhotoItemMetrics = Partial<Record<PhotoItemMetricKey, number>>;

export type UploadItemState =
  | 'idle'
  | 'preparing'
  | 'uploading'
  | 'uploaded'
  | 'processing'
  | 'ready'
  | 'error';

export interface PhotoItem {
  id: string;
  fileName: string;
  originalSize: number;
  preparedSize: number;
  mimeType: string;
  previewUrl?: string;
  blobUrl?: string;
  uploadUrl?: string;
  lineArtUrl?: string;
  analysis?: LineArtAnalysis;
  referenceUrl?: string;
  progress: number;
  state: UploadItemState;
  error?: string;
  lastUpdated: number;
  metrics?: PhotoItemMetrics;
  events?: PhotoItemEvent[];
}
