import type { DiagnosticsSummary } from '../types/diagnostics';
import { formatDateTime, formatDurationMs } from '../utils/formatters';

interface DiagnosticsPanelProps {
  summary: DiagnosticsSummary;
}

function formatStatus(status: DiagnosticsSummary['publish']['status']) {
  switch (status) {
    case 'running':
      return 'Publishing…';
    case 'success':
      return 'Last publish complete';
    case 'error':
      return 'Publish error';
    default:
      return 'Idle';
  }
}

export function DiagnosticsPanel({ summary }: DiagnosticsPanelProps) {
  const { pipeline, publish } = summary;
  const statusLabel = formatStatus(publish.status);
  const publishTimestamp = publish.finishedAt ?? publish.startedAt;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand">Diagnostics</p>
          <h2 className="text-xl font-semibold text-slate-900">Pipeline health</h2>
        </div>
        <span className="rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand">
          Internal
        </span>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <StatCard title="Avg prep" value={formatDurationMs(pipeline.avgPrepMs)} subtitle="Queue to upload" />
        <StatCard title="Avg upload" value={formatDurationMs(pipeline.avgUploadMs)} subtitle="Blob transfer" />
        <StatCard title="Avg AI time" value={formatDurationMs(pipeline.avgAiMs)} subtitle="Replicate + OpenAI" />
      </div>
      <div className="mt-6 grid gap-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 md:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">Batch throughput</p>
          <p className="mt-2 text-sm text-slate-700">
            {pipeline.completedItems} of {pipeline.totalItems} items have finished AI processing.
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">Tip enhancement</p>
          <p className="mt-2 text-sm text-slate-700">
            {publish.tipEnhancementFailures ?? 0} fallback(s) on last publish
          </p>
        </div>
      </div>
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white/80 p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Publish status</p>
            <p
              className={`mt-1 text-base font-semibold ${
                publish.status === 'error'
                  ? 'text-rose-600'
                  : publish.status === 'running'
                  ? 'text-amber-600'
                  : 'text-emerald-600'
              }`}
            >
              {statusLabel}
            </p>
            <p className="text-sm text-slate-500">
              {publishTimestamp ? formatDateTime(publishTimestamp) : 'No publish yet'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-slate-400">Duration</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {formatDurationMs(publish.durationMs)}
            </p>
            <p className="text-sm text-slate-500">
              {publish.itemCount ?? 0} item(s)
            </p>
          </div>
        </div>
        {publish.error && (
          <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {publish.error}
          </p>
        )}
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
      <p className="text-[11px] uppercase tracking-wide text-slate-400">{title}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500">{subtitle}</p>
    </div>
  );
}
