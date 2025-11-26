import { useRef, useState } from 'react';
import { BatchList } from '../components/BatchList';
import { BatchSummary } from '../components/BatchSummary';
import { UploadDropzone } from '../components/UploadDropzone';
import { useBatchUploader } from '../state/useBatchUploader';
import { DiagnosticsPanel } from '../components/DiagnosticsPanel';
import { HeroSection } from '../components/HeroSection';
import { HowItWorksSection } from '../components/HowItWorksSection';

export function UploadPage() {
  const {
    items,
    addFiles,
    retryUpload,
    removeItem,
    stats,
    isBusy,
    portal,
    bundle,
    isPublishing,
    publishBundle,
    lastError,
    clearError,
    setSize,
    setSetSize,
    diagnostics,
  } = useBatchUploader();
  const [alerts, setAlerts] = useState<string[]>([]);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const creatorRef = useRef<HTMLDivElement | null>(null);

  const handleAddFiles = async (files: FileList | File[]) => {
    const result = await addFiles(files);
    if (result.errors.length > 0) {
      setAlerts(result.errors);
      setTimeout(() => setAlerts([]), 5000);
    }
  };

  return (
    <section
      className="space-y-10 text-base text-slate-700"
      style={{ margin: '0 auto', maxWidth: '820px', width: '100%' }}
    >
      <HeroSection onGetStarted={() => creatorRef.current?.scrollIntoView({ behavior: 'smooth' })} />
      <HowItWorksSection />
      <div
        className="space-y-6 rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-2xl shadow-slate-200 sm:p-10"
        ref={creatorRef}
      >
        <div className="space-y-3 text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand">Creator console</p>
          <h1 className="font-display text-4xl font-semibold text-slate-900">
            Upload photos for line art
          </h1>
          <p className="mx-auto max-w-2xl text-base text-slate-600">
            Drag-and-drop multiple photos, watch their pipeline status, and publish polished portals
            + coloring books. This console surfaces the diagnostics we need while we gear up for
            broader release.
          </p>
          <div className="pt-4">
            <label className="text-sm font-medium text-slate-600">Available FC set</label>
            <div className="mt-2 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <select
                className="w-full max-w-xs rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-brand focus:outline-none"
                value={setSize}
                onChange={(event) => setSetSize(Number(event.target.value))}
              >
                {[120, 72, 60, 36, 24, 12].map((size) => (
                  <option key={size} value={size}>
                    {size}-pencil set
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500">
                Tips + palette will only use colors from the selected Polychromos set.
              </p>
            </div>
          </div>
        </div>

      {(alerts.length > 0 || lastError) && (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <ul className="list-disc space-y-1 pl-5">
            {alerts.map((message, index) => (
              <li key={`${message}-${index}`}>{message}</li>
            ))}
            {lastError && (
              <li className="flex items-center justify-between gap-4">
                <span>{lastError}</span>
                <button
                  type="button"
                  className="rounded-full border border-amber-400 px-3 py-1 text-xs font-semibold text-amber-900"
                  onClick={clearError}
                >
                  Dismiss
                </button>
              </li>
            )}
          </ul>
        </div>
      )}

        <div className="space-y-6">
          <UploadDropzone onFilesSelected={handleAddFiles} isBusy={isBusy} />
          <BatchSummary {...stats} />
          {portal?.portalUrl && (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
              Portal ready: <a href={portal.portalUrl}>{portal.portalUrl}</a>
            </div>
          )}
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50/80 p-5 sm:flex-row sm:justify-between">
            <button
              type="button"
              className="w-full rounded-full border border-brand bg-brand px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-brand/30 transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              onClick={() => {
                void publishBundle();
              }}
              disabled={stats.ready === 0 || isPublishing}
            >
              {bundle ? 'Published' : isPublishing ? 'Publishing…' : 'Publish bundle'}
            </button>
            {bundle && (
              <span className="text-sm text-slate-600">
                Manifest: <a href={bundle.manifestUrl}>{bundle.portalUrl}</a>
              </span>
            )}
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-700">Studio diagnostics</p>
            <button
              type="button"
              className="text-xs font-semibold uppercase tracking-wide text-brand"
              onClick={() => setShowDiagnostics((prev) => !prev)}
            >
              {showDiagnostics ? 'Hide' : 'Show'} details
            </button>
          </div>
          {showDiagnostics && <DiagnosticsPanel summary={diagnostics} />}
          {!showDiagnostics && (
            <p className="text-xs text-slate-500">
              Live timing + publish stats (internal only) are available when you need them.
            </p>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-3xl">
        <BatchList
          items={items}
          onRetry={retryUpload}
          onRemove={removeItem}
          portalUrl={portal?.portalUrl}
          qrPngUrl={portal?.qrPngUrl}
        />
      </div>
    </section>
  );
}
