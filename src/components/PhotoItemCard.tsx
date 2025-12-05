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
    <div
      style={{
        borderRadius: '14px',
        border: '1px solid var(--color-border)',
        background: '#fff',
        padding: '1rem',
        boxShadow: '0 8px 20px rgba(0,0,0,0.05)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center' }}>
        <div>
          <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{item.fileName}</p>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
            {formatBytes(item.preparedSize)} • Updated {formatDateTime(item.lastUpdated)}
          </p>
        </div>
        <span
          style={{
            borderRadius: '999px',
            border: '1px solid var(--color-border)',
            padding: '0.2rem 0.75rem',
            fontSize: '0.75rem',
            fontWeight: 700,
            color: 'var(--color-text-secondary)',
          }}
        >
          {status}
        </span>
      </div>

      <div style={{ marginTop: '0.75rem', height: '8px', width: '100%', background: '#e5e7eb', borderRadius: '999px' }}>
        <div
          style={{
            height: '100%',
            borderRadius: '999px',
            background: 'var(--color-cta-primary)',
            width: `${item.progress}%`,
            transition: 'width 0.2s ease',
          }}
        />
      </div>

      <div style={{ marginTop: '0.75rem', display: 'grid', gap: '0.5rem', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
        {stageRows.map((row) => (
          <div key={row.key} style={{ border: '1px solid var(--color-border)', borderRadius: '10px', padding: '0.5rem 0.65rem', background: '#f9fafb' }}>
            <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af' }}>{row.label}</p>
            <p style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{formatDuration(row.start, row.end)}</p>
            <p style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{row.end ? 'Complete' : row.start ? 'In progress' : 'Waiting'}</p>
          </div>
        ))}
      </div>

      {timeline.length > 0 && (
        <div style={{ marginTop: '0.75rem', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '0.6rem 0.8rem', background: '#f9fafb' }}>
          <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af' }}>Status feed</p>
          <ol style={{ marginTop: '0.4rem', paddingLeft: '1rem' }}>
            {timeline.map((event) => (
              <li key={event.id} style={{ fontSize: '0.85rem', color: event.kind === 'error' ? '#b91c1c' : event.kind === 'success' ? '#15803d' : 'var(--color-text-secondary)' }}>
                <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#9ca3af' }}>{formatEventTime(event.timestamp)}</span>
                <span style={{ marginLeft: '0.4rem' }}>{event.message}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {(item.previewUrl || item.lineArtUrl) && (
        <div style={{ marginTop: '0.9rem', display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))' }}>
          {item.previewUrl && (
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af' }}>Original</p>
              <div style={{ marginTop: '0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--color-border)', borderRadius: '10px', background: '#f9fafb' }}>
                <img src={item.previewUrl} alt={`${item.fileName} original`} style={{ width: '140px', height: '140px', objectFit: 'cover', borderRadius: '8px' }} />
              </div>
            </div>
          )}
          {item.lineArtUrl && (
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af' }}>Line art</p>
              <div style={{ marginTop: '0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--color-border)', borderRadius: '10px', background: '#fff' }}>
                <img src={item.lineArtUrl} alt={`${item.fileName} line art`} style={{ width: '160px', height: '160px', objectFit: 'contain' }} />
              </div>
            </div>
          )}
        </div>
      )}

      {item.analysis && (
        <div style={{ marginTop: '0.9rem', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '0.75rem', background: '#f9fafb' }}>
          <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af' }}>Color guide</p>
          <ul style={{ marginTop: '0.4rem', paddingLeft: '1rem', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
            {item.analysis.palette.slice(0, 3).map((entry) => (
              <li key={`${item.id}-${entry.fcNo}`} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ display: 'inline-block', width: '14px', height: '14px', borderRadius: '50%', border: '1px solid #d1d5db', backgroundColor: entry.hex }} />
                <span>{entry.fcName}</span>
              </li>
            ))}
            {item.analysis.palette.length === 0 && (
              <li style={{ fontSize: '0.85rem', color: '#9ca3af' }}>Palette coming soon</li>
            )}
          </ul>
          {item.analysis.tips.length > 0 && (
            <ul style={{ marginTop: '0.5rem', paddingLeft: '1rem', color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>
              {item.analysis.tips.slice(0, 2).map((tip) => (
                <li key={`${item.id}-${tip.region}-${tip.fcNo}`}>
                  <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{tip.region}:</span> {tip.tip}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {item.error && <p style={{ marginTop: '0.5rem', color: '#b91c1c' }}>{item.error}</p>}

      <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
        {item.state === 'error' && (
          <button
            type="button"
            className="btn-primary"
            onClick={() => onRetry(item.id)}
            style={{ background: '#fff', color: 'var(--color-cta-primary)', border: '1px solid var(--color-cta-primary)' }}
          >
            Retry
          </button>
        )}
        {item.lineArtUrl && item.state === 'ready' && (
          <PdfDownloadButton item={item} portalUrl={portalUrl} qrPngUrl={qrPngUrl} />
        )}
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          style={{
            borderRadius: '999px',
            border: '1px solid var(--color-border)',
            padding: '0.4rem 1rem',
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            background: '#fff',
            cursor: 'pointer',
          }}
        >
          Remove
        </button>
      </div>
    </div>
  );
}
