import type { PhotoItem } from '../types/photo';
import { PhotoItemCard } from './PhotoItemCard';

interface BatchListProps {
  items: PhotoItem[];
  onRetry: (id: string) => void;
  onRemove: (id: string) => void;
  portalUrl?: string;
  qrPngUrl?: string;
}

export function BatchList({ items, onRetry, onRemove, portalUrl, qrPngUrl }: BatchListProps) {
  if (items.length === 0) {
    return (
      <div
        style={{
          marginTop: '1.5rem',
          borderRadius: '14px',
          border: '2px dashed var(--color-border)',
          background: '#fff',
          padding: '1.5rem',
          textAlign: 'center',
          color: 'var(--color-text-secondary)',
        }}
      >
        Added photos will appear here with status, progress, and actions.
      </div>
    );
  }

  return (
    <div style={{ marginTop: '1.25rem', display: 'grid', gap: '1rem' }}>
      {items.map((item) => (
        <PhotoItemCard
          key={item.id}
          item={item}
          onRetry={onRetry}
          onRemove={onRemove}
          portalUrl={portalUrl}
          qrPngUrl={qrPngUrl}
        />
      ))}
    </div>
  );
}
