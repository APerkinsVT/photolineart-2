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
      <div className="mt-10 rounded-2xl border border-dashed border-slate-200 bg-white/80 px-6 py-12 text-center text-slate-400">
        Added photos will appear here with status, progress, and actions.
      </div>
    );
  }

  return (
    <div className="mt-8 grid gap-4">
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
