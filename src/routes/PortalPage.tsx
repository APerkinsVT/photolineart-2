import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { PortalManifest } from '../types/manifest';
import { fetchBundleManifest } from '../services/portalService';
import { downloadBundleBook } from '../services/pdfService';
import { getTipColors } from '../utils/tipColors';

export function PortalPage() {
  const { portalId } = useParams<{ portalId: string }>();
  const [manifest, setManifest] = useState<PortalManifest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (!portalId) {
      return;
    }
    let cancelled = false;
    fetchBundleManifest(portalId)
      .then((data) => {
        if (!cancelled) {
          setManifest(data);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load portal.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [portalId]);

  if (error) {
    return (
      <section className="space-y-4">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand">Portal</p>
        <h1 className="font-display text-3xl font-semibold text-slate-900">Not found</h1>
        <p className="text-slate-600">{error}</p>
      </section>
    );
  }

  if (!manifest) {
    return (
      <section className="space-y-4">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand">Portal</p>
        <h1 className="font-display text-3xl font-semibold text-slate-900">Loading…</h1>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand">Portal</p>
        <div>
          <h1 className="font-display text-3xl font-semibold text-slate-900">
            {manifest.title || 'PhotoLineArt Set'}
          </h1>
          <p className="text-sm text-slate-500">
            {manifest.items.length} photo(s) • {manifest.model?.name} {manifest.model?.version}
          </p>
        </div>
        <div className="flex flex-col items-center gap-3 md:items-end">
          {manifest.qrPngUrl && (
            <div className="flex flex-col items-center gap-2">
              <img
                src={manifest.qrPngUrl}
                alt="Portal QR"
                className="rounded-xl border border-slate-200 bg-white p-2"
                style={{ width: '7rem', height: '7rem' }}
                loading="lazy"
              />
              <p className="text-xs text-slate-500 break-all max-w-[10rem] text-center">
                {manifest.portalUrl}
              </p>
            </div>
          )}
          <button
            type="button"
            className="rounded-full border border-brand bg-brand px-8 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={async () => {
              try {
                setIsDownloading(true);
                await downloadBundleBook(manifest);
              } catch (err) {
                alert(err instanceof Error ? err.message : 'Failed to build coloring book');
              } finally {
                setIsDownloading(false);
              }
            }}
            disabled={manifest.items.length === 0 || isDownloading}
          >
            {isDownloading ? 'Building book…' : 'Download coloring book'}
          </button>
        </div>
      </div>

      {manifest.items.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-center text-slate-500">
          No photos yet. Publish a bundle from the app page to populate this portal.
        </div>
      ) : (
        <div className="space-y-6">
          {manifest.items.map((item, index) => (
            <article
              key={`${item.lineArtUrl}-${index}`}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex flex-col items-center gap-4">
                <h2 className="text-lg font-semibold text-slate-900">
                  {formatItemTitle(item.title, item.originalUrl, index)}
                </h2>
                <img
                  src={item.originalUrl}
                  alt="Original"
                  className="w-full max-w-md rounded-2xl border border-slate-200 object-cover"
                  loading="lazy"
                />
                <img
                  src={item.lineArtUrl}
                  alt="Line art"
                  className="w-full max-w-md rounded-2xl border border-slate-200 bg-white object-contain"
                  loading="lazy"
                />
              </div>
              <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 divide-y divide-slate-200">
                {item.tips.map((tip) => {
                  const colors = getTipColors(tip, item.palette);
                  return (
                    <div key={`${tip.region}-${tip.fcNo}`} className="space-y-2 p-4">
                      <p className="text-sm text-slate-700">
                        <span className="font-semibold text-slate-900">{tip.region}</span> — {tip.tip}
                      </p>
                      {colors.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
                          {colors.map((color) => (
                            <span
                              key={`${tip.region}-${color.fcNo}`}
                              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1"
                            >
                              <span
                                className="inline-block h-3.5 w-3.5 rounded-sm border border-slate-300"
                                style={{ backgroundColor: color.hex }}
                              />
                              {color.fcNo} · {color.fcName}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="mt-6 flex flex-wrap justify-center gap-3 text-sm">
                <a
                  href={item.originalUrl}
                  className="rounded-full border border-slate-200 px-3 py-1 text-slate-600 hover:border-slate-400"
                  target="_blank"
                  rel="noreferrer"
                >
                  Original
                </a>
                <a
                  href={item.lineArtUrl}
                  className="rounded-full border border-brand px-3 py-1 text-brand hover:bg-brand hover:text-white"
                  target="_blank"
                  rel="noreferrer"
                >
                  Line art
                </a>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function formatItemTitle(title?: string, url?: string, index?: number) {
  if (title) {
    return title;
  }
  const fallback = typeof index === 'number' ? `Photo ${index + 1}` : 'Photo';
  if (!url) {
    return fallback;
  }
  const fileName = url.split('/').pop() ?? fallback;
  const withoutExt = fileName.replace(/\.[^/.]+$/, '');
  return withoutExt
    .split(/[-_ ]+/)
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(' ');
}
