import { useEffect, useRef, useState } from 'react';
import { BatchList } from '../components/BatchList';
import { BatchSummary } from '../components/BatchSummary';
import { UploadDropzone } from '../components/UploadDropzone';
import { useBatchUploader } from '../state/useBatchUploader';
import { DiagnosticsPanel } from '../components/DiagnosticsPanel';
import { nanoid } from 'nanoid';
import { buildBundleBookDataUrl } from '../services/pdfService';

export function StudioPage() {
  const {
    items,
    addFiles,
    retryUpload,
    removeItem,
    stats,
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
  const listRef = useRef<HTMLDivElement | null>(null);
  const [staged, setStaged] = useState<{ id: string; file: File; preview: string; selected: boolean }[]>([]);
  const selectedCount = staged.filter((s) => s.selected).length;
  const [expectedCount, setExpectedCount] = useState(0);
  const [bookEmail, setBookEmail] = useState('aperkinsvt@gmail.com');
  const [bookSending, setBookSending] = useState(false);
  const [bookSent, setBookSent] = useState(false);

  const handleAddFiles = async (files: FileList | File[]) => {
    const incoming = Array.from(files);
    const maxCount = 10;
    const selectedCount = staged.filter((s) => s.selected).length;

    const next = incoming.map((file, index) => ({
      id: nanoid(),
      file,
      preview: URL.createObjectURL(file),
      selected: selectedCount + index < maxCount,
    }));

    if (next.length > 0) {
      setStaged((prev) => [...prev, ...next]);
    }
  };

  const toggleStaged = (id: string) => {
    setStaged((prev) =>
      prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item)),
    );
  };

  const startProcessing = async () => {
    const selected = staged.filter((s) => s.selected);
    if (selected.length === 0) {
      setAlerts(['Select at least one photo to start processing.']);
      setTimeout(() => setAlerts([]), 3000);
      return;
    }
    setExpectedCount(selected.length);
    const files = selected.map((s) => s.file);
    const result = await addFiles(files);
    if (result.errors.length > 0) {
      setAlerts(result.errors);
      setTimeout(() => setAlerts([]), 5000);
    }
    // remove all staged after send to avoid confusion
    setStaged((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.preview));
      return [];
    });
  };

  useEffect(() => {
    if (expectedCount === 0) return;
    if (stats.ready >= expectedCount && !isPublishing && !bundle) {
      void publishBundle().catch((err) => {
        console.error('Auto-publish failed', err);
        setAlerts(['Book publish failed. Please try again.']);
        setTimeout(() => setAlerts([]), 4000);
      });
    }
  }, [expectedCount, stats.ready, isPublishing, bundle, publishBundle]);

  useEffect(() => {
    setBookSent(false);
  }, [expectedCount]);

  // Log a run to Supabase when a book is sent (best-effort)
  const logRun = async (manifestUrl?: string, portalUrl?: string) => {
    try {
      await fetch('/api/log-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'book',
          photos_count: expectedCount || undefined,
          pages_count: undefined,
          status: 'ready',
          manifest_url: manifestUrl,
          portal_url: portalUrl,
          email: bookEmail || undefined,
        }),
      });
    } catch (err) {
      console.warn('Run log failed (continuing):', err);
    }
  };

  const sendBookEmail = async () => {
    if (!bundle?.manifestUrl || !bookEmail) {
      setAlerts(['Book is not ready yet or email missing.']);
      setTimeout(() => setAlerts([]), 3000);
      return;
    }
    try {
      setBookSending(true);
      const resp = await fetch(bundle.manifestUrl);
      if (!resp.ok) throw new Error('Unable to load book manifest');
      const manifest = await resp.json();
      const { dataUrl, fileName } = await buildBundleBookDataUrl(manifest);
      await fetch('/api/send-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: bookEmail,
          pdfBase64: dataUrl,
          filename: fileName,
          subject: 'Your PhotoLineArt coloring book',
          text: [
            'Your book PDF is attached. You can also reopen it anytime via your private link:',
            manifest.portalUrl,
            '',
            'We delete your uploads after processing.',
          ].join('\n'),
          source: 'book',
        }),
      });
      void logRun(bundle.manifestUrl, manifest.portalUrl);
      setBookSent(true);
    } catch (err) {
      console.error(err);
      setAlerts(['Unable to email the book right now. Please try again.']);
      setTimeout(() => setAlerts([]), 4000);
    } finally {
      setBookSending(false);
    }
  };


  return (
    <div className="page" style={{ paddingBottom: '4rem' }}>
      <section className="section section--base">
        <div className="container hero">
          <div className="hero-inner" style={{ textAlign: 'center' }}>
            <p className="problem-subtitle" style={{ textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
              Creator Console
            </p>
            <h1 className="hero-heading">Build a coloring book from many photos</h1>
            <p className="hero-lead">
              Upload up to 10 photos, get clean line art + palettes, and auto-publish a printable book with a portal link and QR for gifting.
            </p>
            <div className="hero-cta">
              <a href="#studio-console" className="btn-primary" onClick={() => creatorRef.current?.scrollIntoView({ behavior: 'smooth' })}>
                Start my book
              </a>
            </div>
            {expectedCount > 0 && (
              <p className="hero-meta" style={{ marginTop: '0.35rem' }}>
                Processing {expectedCount} photo(s)… we’ll email your book as soon as it’s ready.
              </p>
            )}
          </div>
        </div>
      </section>

      <section id="studio-console" className="section section--white">
        <div className="container" style={{ maxWidth: '900px' }} ref={creatorRef}>
          <div
            style={{
              background: '#fff',
              borderRadius: '18px',
              border: '1px solid var(--color-border)',
              boxShadow: '0 16px 40px rgba(0,0,0,0.08)',
              padding: '1.75rem',
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-cta-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Upload console
              </p>
              <h2 className="section-heading" style={{ marginBottom: '0.5rem' }}>
                Upload and publish automatically
              </h2>
              <p style={{ maxWidth: '640px', margin: '0 auto', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                Drag-and-drop multiple photos, watch their status, and we’ll publish a portal + printable book automatically. Pages follow your upload order—no extra steps required.
              </p>
              <div style={{ marginTop: '1rem' }}>
                <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>Available Faber-Castell set</label>
                <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.75rem', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
                  <select
                    value={setSize}
                    onChange={(event) => setSetSize(Number(event.target.value))}
                    style={{
                      borderRadius: '12px',
                      border: '1px solid var(--color-border)',
                      padding: '0.5rem 0.75rem',
                      minWidth: '200px',
                    }}
                  >
                    {[120, 72, 60, 36, 24, 12].map((size) => (
                      <option key={size} value={size}>
                        {size}-pencil set
                      </option>
                    ))}
                  </select>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                    Palettes + tips will respect the selected Polychromos set.
                  </p>
                </div>
              </div>
            </div>

            {(alerts.length > 0 || lastError) && (
              <div
                style={{
                  marginTop: '1rem',
                  borderRadius: '12px',
                  border: '1px solid #fcd34d',
                  background: '#fffbeb',
                  padding: '0.75rem 1rem',
                  color: '#92400e',
                  fontSize: '0.95rem',
                }}
              >
                <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                  {alerts.map((message, index) => (
                    <li key={`${message}-${index}`}>{message}</li>
                  ))}
                  {lastError && (
                    <li>
                      {lastError}{' '}
                      <button
                        type="button"
                        onClick={clearError}
                        style={{
                          marginLeft: '0.5rem',
                          border: '1px solid #fbbf24',
                          borderRadius: '999px',
                          padding: '0.15rem 0.6rem',
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                        }}
                      >
                        Dismiss
                      </button>
                    </li>
                  )}
                </ul>
              </div>
            )}

            <div style={{ display: 'grid', gap: '1.25rem', marginTop: '1.25rem' }}>
              <UploadDropzone
                onFilesSelected={handleAddFiles}
                currentCount={selectedCount}
              />

              {staged.length > 0 && (
                <div
                  style={{
                    border: '1px solid var(--color-border)',
                    borderRadius: '12px',
                    padding: '0.75rem',
                    background: '#fff',
                  }}
                >
                  <div
                    style={{
                      marginBottom: '0.6rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      color: 'var(--color-text-secondary)',
                      fontSize: '0.9rem',
                      flexWrap: 'wrap',
                      gap: '0.4rem',
                    }}
                  >
                    <span>
                      {selectedCount} selected • {staged.length} staged
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gap: '0.75rem',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                    }}
                  >
                    {staged.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          border: '1px solid var(--color-border)',
                          borderRadius: '10px',
                          padding: '0.4rem',
                          textAlign: 'center',
                          background: '#fff',
                          position: 'relative',
                        }}
                      >
                        <div style={{ width: '100%', paddingTop: '100%', position: 'relative', overflow: 'hidden', borderRadius: '8px', background: '#f9fafb' }}>
                          <img
                            src={item.preview}
                            alt={item.file.name}
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                            }}
                          />
                        </div>
                        <div style={{ marginTop: '0.35rem', fontSize: '0.8rem', color: 'var(--color-text-secondary)', minHeight: '2.2em' }}>
                          {item.file.name}
                        </div>
                        <div style={{ marginTop: '0.3rem', display: 'flex', justifyContent: 'center' }}>
                          <input
                            type="checkbox"
                            checked={item.selected}
                            onChange={() => toggleStaged(item.id)}
                            aria-label="Include in book"
                            style={{ width: '18px', height: '18px' }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: '0.6rem', textAlign: 'center' }}>
                    {selectedCount > 10 && (
                      <span style={{ color: '#b91c1c', fontWeight: 700, fontSize: '0.9rem' }}>
                        Uncheck {selectedCount - 10} or more photos. Max = 10.
                      </span>
                    )}
                  </div>
                  <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'center' }}>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={startProcessing}
                      disabled={selectedCount === 0 || selectedCount > 10}
                      style={{ opacity: selectedCount === 0 || selectedCount > 10 ? 0.6 : 1 }}
                    >
                      Start processing ({selectedCount} selected)
                    </button>
                  </div>
                </div>
              )}

              <BatchSummary {...stats} />

              {expectedCount > 0 && !bundle && (
                <div style={{ margin: '0.5rem 0', textAlign: 'center' }}>
                  <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                    {isPublishing
                      ? 'Preparing your one-of-a-kind personalized coloring book…'
                      : 'Finishing up your book and getting it ready…'}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '0.35rem', marginTop: '0.4rem', color: 'var(--color-cta-primary)' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'currentColor', animation: 'bounce 1s infinite' }} />
                    <span
                      style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: 'currentColor',
                        animation: 'bounce 1s infinite',
                        animationDelay: '0.15s',
                      }}
                    />
                    <span
                      style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: 'currentColor',
                        animation: 'bounce 1s infinite',
                        animationDelay: '0.3s',
                      }}
                    />
                  </div>
                </div>
              )}

              {bundle && (
                <div
                  style={{
                    border: '1px solid var(--color-border)',
                    borderRadius: '12px',
                    padding: '1rem',
                    background: '#f7f3ec',
                    display: 'grid',
                    gap: '0.65rem',
                  }}
                >
                  <div style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>Your coloring book is ready</div>
                  <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
                    We’ll email you the book PDF plus a private link and QR so you can re-open or reprint anytime.
                  </p>
                  <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    Email address
                  </label>
                  <input
                    type="email"
                    value={bookEmail}
                    onChange={(e) => setBookEmail(e.target.value)}
                    style={{
                      border: '1px solid var(--color-border)',
                      borderRadius: '10px',
                      padding: '0.65rem 0.75rem',
                      fontSize: '0.95rem',
                    }}
                    placeholder="you@example.com"
                  />
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={sendBookEmail}
                    disabled={!bookEmail || bookSending}
                    style={{ opacity: bookEmail && !bookSending ? 1 : 0.6 }}
                  >
                    {bookSending ? 'Sending…' : bookSent ? 'Sent!' : 'Email my book'}
                  </button>
                  {bookSending && (
                    <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                      Packaging your coloring book for email…
                    </p>
                  )}
                  {bookSent && (
                    <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                      Sent! Check your inbox. Your private link is below.
                    </p>
                  )}
                  {bundle.portalUrl && (
                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
                      Private link: <a href={bundle.portalUrl} style={{ color: 'var(--color-cta-primary)', fontWeight: 600 }}>{bundle.portalUrl}</a>
                    </p>
                  )}
                </div>
              )}
            </div>

            <div style={{ marginTop: '1rem', borderRadius: '12px', border: '1px solid var(--color-border)', background: '#f9fafb', padding: '0.85rem 1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                <p style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>Studio diagnostics</p>
                <button
                  type="button"
                  onClick={() => setShowDiagnostics((prev) => !prev)}
                  style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-cta-primary)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  {showDiagnostics ? 'Hide' : 'Show'} details
                </button>
              </div>
              {showDiagnostics ? (
                <div style={{ marginTop: '0.5rem' }}>
                  <DiagnosticsPanel summary={diagnostics} />
                </div>
              ) : (
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                  Live timing + publish stats (internal only) are available when you need them.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="section section--white" style={{ paddingTop: 0 }}>
        <div className="container" style={{ maxWidth: '900px' }} ref={listRef}>
          <BatchList
            items={items}
            onRetry={retryUpload}
            onRemove={removeItem}
            portalUrl={portal?.portalUrl}
            qrPngUrl={portal?.qrPngUrl}
          />
        </div>
      </section>
    </div>
  );
}
