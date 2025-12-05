import { formatBytes } from '../utils/formatters';

interface BatchSummaryProps {
  total: number;
  uploading: number;
  processing: number;
  ready: number;
  failed: number;
  totalBytes: number;
}

export function BatchSummary({
  total,
  uploading,
  processing,
  ready,
  failed,
  totalBytes,
}: BatchSummaryProps) {
  if (total === 0) {
    return null;
  }

  return (
    <div
      style={{
        marginTop: '0.5rem',
        borderRadius: '12px',
        border: '1px solid var(--color-border)',
        background: '#f9fafb',
        padding: '0.9rem 1rem',
        color: 'var(--color-text-secondary)',
        fontSize: '0.95rem',
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', alignItems: 'center' }}>
        <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{total} photo(s)</span>
        <span>•</span>
        <span>{formatBytes(totalBytes)} total</span>
        <span>•</span>
        <span>{uploading} uploading</span>
        <span>•</span>
        <span>{processing} with AI</span>
        <span>•</span>
        <span>{ready} ready</span>
        {failed > 0 && (
          <>
            <span>•</span>
            <span style={{ color: '#b91c1c', fontWeight: 600 }}>{failed} failed</span>
          </>
        )}
      </div>
    </div>
  );
}
