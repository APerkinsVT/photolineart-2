import type { PhotoItem } from '../types/photo';
import { formatBytes, formatDateTime } from '../utils/formatters';
import { PdfDownloadButton } from './PdfDownloadButton';

interface PhotoItemCardProps {
  item: PhotoItem;
  onRetry: (id: string) => void;
  onRemove: (id: string) => void;
  portalUrl?: string;
  qrPngUrl?: string;
}

function statusLabel(state: PhotoItem['state']) {
  switch (state) {
    case 'preparing':
      return 'Preparing';
    case 'uploading':
      return 'Uploading';
    case 'uploaded':
      return 'Uploaded';
    case 'ready':
      return 'Ready';
    case 'processing':
      return 'Processing';
    case 'error':
      return 'Error';
    default:
      return 'Idle';
  }
}

function formatDuration(start?: number, end?: number) {
  if (!start) {
    return '—';
  }
  const finish = end ?? Date.now();
  const elapsed = Math.max(0, finish - start);
  if (elapsed < 1000) {
    return '<1s';
  }
  const seconds = Math.round(elapsed / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const minutesLeft = minutes % 60;
    return minutesLeft > 0 ? `${hours}h ${minutesLeft}m` : `${hours}h`;
  }
  return remaining === 0 ? `${minutes}m` : `${minutes}m ${remaining}s`;
}

function formatEventTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function PhotoItemCard({
  item,
  onRetry,
  onRemove,
  portalUrl,
  qrPngUrl,
}: PhotoItemCardProps) {
  const status = statusLabel(item.state);
  const metrics = item.metrics ?? {};
  const stageRows = [
    {
      key: 'prep',
      label: 'Prep',
      start: metrics.preparingStartedAt ?? metrics.queuedAt,
      end: metrics.uploadStartedAt ?? metrics.uploadCompletedAt,
    },
    {
      key: 'upload',
      label: 'Upload',
      start: metrics.uploadStartedAt,
      end: metrics.uploadCompletedAt,
    },
    {
      key: 'ai',
      label: 'AI',
      start: metrics.processingStartedAt,
      end: metrics.readyAt,
    },
  ];
  const timeline = (item.events ?? []).slice(-4);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-base font-semibold text-slate-900">{item.fileName}</p>
          <p className="text-xs text-slate-500">
            {formatBytes(item.preparedSize)} • Updated {formatDateTime(item.lastUpdated)}
          </p>
        </div>
        <span
          className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500"
          data-state={item.state}
        >
          {status}
        </span>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-brand transition-all"
          style={{ width: `${item.progress}%` }}
        />
      </div>
      <div className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-3">
        {stageRows.map((row) => (
          <div key={row.key} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">{row.label}</p>
            <p className="text-sm font-semibold text-slate-900">{formatDuration(row.start, row.end)}</p>
            <p className="text-[11px] text-slate-400">
              {row.end ? 'Complete' : row.start ? 'In progress' : 'Waiting'}
            </p>
          </div>
        ))}
      </div>
      {item.state === 'processing' && !item.error && (
        <p className="mt-2 text-sm text-slate-500">Sending to Replicate…</p>
      )}
      {timeline.length > 0 && (
        <div className="mt-3 rounded-2xl border border-slate-100 bg-white/70 p-3">
          <p className="text-[11px] uppercase tracking-wide text-slate-400">Status feed</p>
          <ol className="mt-2 space-y-1">
            {timeline.map((event) => (
              <li key={event.id} className="text-xs text-slate-600">
                <span className="font-mono text-[11px] text-slate-400">{formatEventTime(event.timestamp)}</span>
                <span
                  className={`ml-2 ${
                    event.kind === 'error'
                      ? 'text-rose-600'
                      : event.kind === 'success'
                      ? 'text-emerald-600'
                      : 'text-slate-600'
                  }`}
                >
                  {event.message}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
      {(item.previewUrl || item.lineArtUrl) && (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {item.previewUrl && (
            <div>
              <p className="text-xs uppercase text-slate-400">Original preview</p>
              <div className="mt-2 flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
                <img
                  src={item.previewUrl}
                  alt={`${item.fileName} original`}
                  className="object-cover"
                  style={{ width: '128px', height: '128px' }}
                />
              </div>
            </div>
          )}
          {item.lineArtUrl && (
            <div>
              <p className="text-xs uppercase text-slate-400">Line art preview</p>
              <div className="mt-2 flex items-center justify-center rounded-xl border border-slate-200 bg-white">
                <img
                  src={item.lineArtUrl}
                  alt={`${item.fileName} line art`}
                  className="object-contain"
                  style={{ width: '160px', height: '160px' }}
                />
              </div>
            </div>
          )}
        </div>
      )}
      {item.analysis && (
        <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
          <p className="text-xs uppercase text-slate-400">Color guide</p>
          <ul className="mt-2 space-y-1 text-sm text-slate-600">
            {item.analysis.palette.slice(0, 3).map((entry) => (
              <li key={`${item.id}-${entry.fcNo}`} className="flex items-center gap-2">
                <span
                  className="inline-block h-4 w-4 rounded-full border"
                  style={{ backgroundColor: entry.hex }}
                />
                <span>{entry.fcName}</span>
              </li>
            ))}
            {item.analysis.palette.length === 0 && (
              <li className="text-xs text-slate-400">Palette coming soon</li>
            )}
          </ul>
          {item.analysis.tips.length > 0 && (
            <ul className="mt-3 space-y-1 text-xs text-slate-500">
              {item.analysis.tips.slice(0, 2).map((tip) => (
                <li key={`${item.id}-${tip.region}-${tip.fcNo}`}>
                  <span className="font-semibold text-slate-600">{tip.region}:</span> {tip.tip}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {item.error && <p className="mt-2 text-sm text-rose-600">{item.error}</p>}
      <div className="mt-4 flex flex-wrap gap-3">
        {item.state === 'error' && (
          <button
            type="button"
            className="rounded-full border border-brand px-4 py-1.5 text-sm font-medium text-brand hover:bg-brand hover:text-white"
            onClick={() => onRetry(item.id)}
          >
            Retry
          </button>
        )}
        {item.lineArtUrl && item.state === 'ready' && (
          <PdfDownloadButton item={item} portalUrl={portalUrl} qrPngUrl={qrPngUrl} />
        )}
        <button
          type="button"
          className="rounded-full border border-slate-200 px-4 py-1.5 text-sm font-medium text-slate-600 hover:border-slate-400"
          onClick={() => onRemove(item.id)}
        >
          Remove
        </button>
      </div>
    </div>
  );
}
