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
    <div className="mt-8 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600 shadow-sm">
      <div className="flex flex-wrap items-center gap-4">
        <span className="font-semibold text-slate-900">{total} photo(s)</span>
        <span className="text-slate-400">•</span>
        <span>{formatBytes(totalBytes)} total</span>
        <span className="text-slate-400">•</span>
        <span>{uploading} uploading</span>
        <span className="text-slate-400">•</span>
        <span>{processing} with AI</span>
        <span className="text-slate-400">•</span>
        <span>{ready} ready</span>
        {failed > 0 && (
          <>
            <span className="text-slate-400">•</span>
            <span className="text-rose-500">{failed} failed</span>
          </>
        )}
      </div>
    </div>
  );
}
