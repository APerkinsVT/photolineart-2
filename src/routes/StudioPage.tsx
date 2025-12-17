import { useEffect, useRef, useState } from 'react';
import { BatchSummary } from '../components/BatchSummary';
import { UploadDropzone } from '../components/UploadDropzone';
import { useBatchUploader } from '../state/useBatchUploader';
import { nanoid } from 'nanoid';
import { buildBundleBookDataUrl } from '../services/pdfService';

function renameFileWithTitle(file: File, title?: string) {
  const cleanTitle = (title ?? '').trim();
  if (!cleanTitle) return file;
  const extMatch = file.name.match(/\.([^.]+)$/);
  const ext = extMatch ? `.${extMatch[1]}` : '';
  return new File([file], `${cleanTitle}${ext}`, { type: file.type });
}

export function StudioPage() {
  const {
    addFiles,
    stats,
    bundle,
    isPublishing,
    publishBundle,
    lastError,
    clearError,
    setSize,
    setSetSize,
  } = useBatchUploader();
  const [alerts, setAlerts] = useState<string[]>([]);
  const creatorRef = useRef<HTMLDivElement | null>(null);
  type StagedItem = { id: string; file: File; preview: string; selected: boolean; title: string };
  const [staged, setStaged] = useState<StagedItem[]>([]);
  const selectedCount = staged.filter((s) => s.selected).length;
  const [expectedCount, setExpectedCount] = useState(0);
  const [bookEmail, setBookEmail] = useState('');
  const [bookSending, setBookSending] = useState(false);
  const [sendStatus, setSendStatus] = useState<string>('');
  const [bookSent, setBookSent] = useState(false);
  const [retentionChoice, setRetentionChoice] = useState<string>('');
  const [openStudioFaq, setOpenStudioFaq] = useState<number | null>(null);
  const trackEvent = (metaEvent: string, gaEvent: string, payload?: Record<string, any>) => {
    const win = typeof window !== 'undefined' ? (window as any) : null;
    if (win?.fbq) {
      try {
        win.fbq('trackCustom', metaEvent, payload);
      } catch (err) {
        console.warn('fbq track failed', err);
      }
    }
    if (win?.gtag) {
      try {
        win.gtag('event', gaEvent, payload);
      } catch (err) {
        console.warn('gtag track failed', err);
      }
    }
  };

  useEffect(() => {
    trackEvent('PageView_Studio', 'page_view', {
      page_title: 'Studio',
      page_path: typeof window !== 'undefined' ? window.location.pathname : '/studio',
    });
  }, []);

  const handleAddFiles = async (files: FileList | File[]) => {
    const incoming = Array.from(files);
    const maxCount = 10;
    const selectedCount = staged.filter((s) => s.selected).length;

    const next = incoming.map((file, index) => ({
      id: nanoid(),
      file,
      preview: URL.createObjectURL(file),
      selected: selectedCount + index < maxCount,
      title: '', // user-editable; fallback to file.name when unused
    }));

    if (next.length > 0) {
      trackEvent('SP_ChoosePhotos', 'sp_choose_photos', { count: next.length });
      setStaged((prev: StagedItem[]): StagedItem[] => [...prev, ...next]);
    }
  };

  const toggleStaged = (id: string) => {
    setStaged((prev: StagedItem[]): StagedItem[] =>
      prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item)),
    );
  };

  const updateTitle = (id: string, value: string) => {
    setStaged((prev: StagedItem[]): StagedItem[] =>
      prev.map((item) => (item.id === id ? { ...item, title: value } : item)),
    );
  };

  const startProcessing = async () => {
    const selected = staged.filter((s) => s.selected);
    if (selected.length === 0) {
      setAlerts(['Select at least one photo to start processing.']);
      setTimeout(() => setAlerts([]), 3000);
      return;
    }
    trackEvent('SP_StartProcessing', 'sp_start_processing', { count: selected.length });
    setExpectedCount(selected.length);
    setRetentionChoice('');
    const files = selected.map((s) => renameFileWithTitle(s.file, s.title));
    const result = await addFiles(files);
    if (result.errors.length > 0) {
      setAlerts(result.errors);
      setTimeout(() => setAlerts([]), 5000);
    }
    // remove all staged after send to avoid confusion
    setStaged((prev: StagedItem[]): StagedItem[] => {
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
  const logRun = async (
    manifestUrl?: string,
    portalUrl?: string,
    photosCountOverride?: number,
    retention?: string,
    pdfUrl?: string,
    runId?: string,
  ) => {
    try {
      const payload = {
        source: 'book',
        pla_run_id: runId ?? undefined,
        photos_count: photosCountOverride ?? expectedCount ?? undefined,
        status: 'ready',
        manifest_url: manifestUrl,
        portal_url: portalUrl,
        email: bookEmail || undefined,
        retention_choice: retention || undefined,
        pdf_url: pdfUrl || undefined,
      };
      const resp = await fetch('/api/log-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) {
        const text = await resp.text();
        console.warn('log-run failed', resp.status, text);
      } else {
        console.log('log-run ok', payload);
      }
    } catch (err) {
      console.warn('Run log failed (continuing):', err);
    }
  };

  const sendBookEmail = async () => {
    if (!bundle?.manifestUrl || !bookEmail || !retentionChoice) {
      setAlerts(['Book is not ready yet, email missing, or file handling choice not selected.']);
      setTimeout(() => setAlerts([]), 3000);
      return;
    }
    try {
      setBookSending(true);
      setSendStatus(
        retentionChoice === 'keep_30_days'
          ? 'Sending your book and saving files for 30 days…'
          : 'Sending your book and deleting files…',
      );
      const resp = await fetch(bundle.manifestUrl);
      if (!resp.ok) throw new Error('Unable to load book manifest');
      const manifest = await resp.json();
      const photosCount =
        (Array.isArray(manifest?.pages) && manifest.pages.length) ||
        (Array.isArray(manifest?.items) && manifest.items.length) ||
        (Array.isArray(manifest?.artifacts) && manifest.artifacts.length) ||
        expectedCount ||
        undefined;
      const runId = bundle?.id || manifest.id || `book-${Date.now()}`;
      const proxyUrl = `${window.location.origin}/api/download?run_id=${encodeURIComponent(runId)}${
        bookEmail ? `&email=${encodeURIComponent(bookEmail)}` : ''
      }&manifest_url=${encodeURIComponent(bundle.manifestUrl)}`;

      // Set the manifest link/QR before we render the PDF
      if (retentionChoice === 'keep_30_days') {
        manifest.portalUrl = proxyUrl;
        manifest.qrPngUrl = undefined;
      } else {
        // For delete-after-send, point people back to the landing page with a QR/text link.
        manifest.portalUrl = window.location.origin;
        manifest.qrPngUrl = undefined;
      }

      const { dataUrl, fileName } = (await buildBundleBookDataUrl(manifest)) as {
        dataUrl: string;
        fileName: string;
      };
      const pdfSizeBytes = Math.round((dataUrl.length * 3) / 4);
      const attachThreshold = 5 * 1024 * 1024; // 5 MB
      const allowAttachment = pdfSizeBytes <= attachThreshold;

      let uploadUrl: string | undefined;
      if (retentionChoice === 'keep_30_days') {
        try {
          const path = `bundles/${runId}.pdf`;
          console.log('Uploading book PDF', { runId, path, size: dataUrl.length });
          const uploadResp = await fetch('/api/upload-pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              path,
              dataUrl,
            }),
          });
          if (!uploadResp.ok) {
            const text = await uploadResp.text();
            throw new Error(`Upload failed: ${uploadResp.status} ${text}`);
          }
          const uploadJson = await uploadResp.json();
          uploadUrl = uploadJson.url as string;
          console.log('PDF uploaded', uploadUrl);
        } catch (err) {
          console.error('PDF upload failed (continuing without stored PDF):', err);
        }
      }

      const finalUrl = retentionChoice === 'keep_30_days' ? proxyUrl : undefined;
      await fetch('/api/send-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: bookEmail,
          pdfBase64: allowAttachment ? dataUrl : undefined,
          filename: fileName,
          subject: 'Your PhotoLineArt coloring book',
          text: [
            'Your book PDF is attached.',
            retentionChoice === 'keep_30_days'
              ? finalUrl
                ? `You can also download it anytime for 30 days: ${finalUrl}`
                : 'We are retaining your files for 30 days in case you need a resend.'
              : `We delete your uploads after sending. Upload and print another: ${window.location.origin}`,
            '',
            'Print & bind tips:',
            '- Paper: use 80–100 lb paper to avoid bleed-through and give your pencils a premium feel.',
            '- Printing: double-sided keeps the layout with line art on the right; consider borderless for full page art.',
            '- Binding: use a coil/comb or 3-hole punch; add a thick cover if you like.',
            '- Home printing: check “actual size” and high-quality mode; use a fresh black cartridge for clean lines.',
          ].join('\n'),
          source: 'book',
        }),
      });
      void logRun(bundle.manifestUrl, finalUrl, photosCount, retentionChoice, uploadUrl, runId);
      trackEvent('SP_EmailBook', 'sp_email_book', { retention: retentionChoice, photos: photosCount });
      setBookSent(true);
    } catch (err) {
      console.error(err);
      setAlerts(['Unable to email the book right now. Please try again.']);
      setTimeout(() => setAlerts([]), 4000);
    } finally {
      setBookSending(false);
      setSendStatus('');
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
            <h1 className="hero-heading">Build a custom coloring book using your own photos</h1>
            <p className="hero-lead">
              Upload up to 10 photos. We’ll turn them into high‑fidelity line art and personalized color guides, then auto‑publish a beautiful PDF coloring book that's ready to print or share.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', margin: '18px auto 20px' }}>
              <img
                src="/images/boys-at-lake.png"
                alt="Example photo and line art"
                style={{
                  maxWidth: '520px',
                  width: '100%',
                  borderRadius: '14px',
                  boxShadow: '0 18px 35px rgba(0,0,0,0.08)',
                  margin: '0 auto',
                }}
              />
            </div>


            <div className="hero-cta">
              <a
                href="#studio-console"
                className="btn-primary"
                onClick={() => {
                  trackEvent('SP_StartMyBook', 'sp_start_my_book');
                  creatorRef.current?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
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
              padding: '2rem',
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
                Drag-and-drop multiple photos. After processing, we’ll send your print-ready book automatically. You can even re-title the photos for the page header.
              </p>
              <div style={{ marginTop: '1rem' }}>
                <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>Select your Faber‑Castell Polychromos set below:</label>
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

                </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                Color palettes match the selected pencil set + expert tips are generated for your exact photos.
              </p>              
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
              <div
                style={{
                  border: '1px dashed var(--color-border)',
                  borderRadius: '12px',
                  padding: '0.85rem',
                  background: '#fff',
                  display: 'grid',
                  gap: '0.5rem',
                }}
              >
                <label style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  Enter your email to receive your finished book
                </label>
                <input
                  type="email"
                  value={bookEmail}
                  onChange={(e) => setBookEmail(e.target.value)}
                  placeholder="you@email.com"
                  style={{
                    border: '1px solid var(--color-border)',
                    borderRadius: '10px',
                    padding: '0.65rem 0.75rem',
                    fontSize: '0.95rem',
                  }}
                />
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                  We’ll email the finished PDF. You can choose to delete your photos and PDF right away or save them for 30 days.
                </p>
              </div>

              {expectedCount === 0 && (
                <UploadDropzone
                  onFilesSelected={handleAddFiles}
                  currentCount={selectedCount}
                />
              )}

              {expectedCount === 0 && staged.length > 0 && (
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <span>
                        {selectedCount} selected • {staged.length} staged
                      </span>
                      <span style={{ fontSize: '0.85rem' }}>
                        Edit each photo title as you want it to appear in the book (filenames stay unchanged).
                      </span>
                    </div>
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gap: '0.75rem',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                    }}
                  >
                    {staged.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          border: '1px solid var(--color-border)',
                          borderRadius: '10px',
                          padding: '0.4rem',
                          background: '#fff',
                          position: 'relative',
                          display: 'grid',
                          gap: '0.35rem',
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
                        <input
                          type="text"
                          value={item.title}
                          onChange={(e) => updateTitle(item.id, e.target.value)}
                          placeholder={item.file.name}
                          style={{
                            width: '100%',
                            border: '1px solid var(--color-border)',
                            borderRadius: '8px',
                            padding: '0.4rem 0.5rem',
                            fontSize: '0.85rem',
                            color: item.title ? 'var(--color-text-primary)' : '#9ca3af',
                          }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
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
                  {expectedCount === 0 && (
                    <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'center' }}>
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={startProcessing}
                        disabled={selectedCount === 0 || selectedCount > 10 || !bookEmail}
                        style={{ opacity: selectedCount === 0 || selectedCount > 10 || !bookEmail ? 0.6 : 1 }}
                      >
                        Start processing ({selectedCount} selected)
                      </button>
                    </div>
                  )}
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
                  <p style={{ margin: '0.35rem 0 0 0', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                    We’ll email it to {bookEmail || 'your email'} in about 8–10 minutes.
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
                    We’ll email you the book PDF. Save it so you can reprint anytime.
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
                    placeholder="you@email.com"
                  />
                  <div style={{ display: 'grid', gap: '0.35rem' }}>
                    <label style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                      File handling after send (required)
                    </label>
                    <select
                      value={retentionChoice}
                      onChange={(e) => setRetentionChoice(e.target.value)}
                      disabled={bookSending || bookSent}
                      style={{
                        border: '1px solid var(--color-border)',
                        borderRadius: '10px',
                        padding: '0.55rem 0.65rem',
                        fontSize: '0.95rem',
                      }}
                    >
                      <option value="">Choose an option</option>
                      <option value="delete_after_send">Delete my photos and book after sending</option>
                      <option value="keep_30_days">Keep my files for 30 days (for resend requests)</option>
                    </select>
                  </div>
                  {!bookSent && (
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={sendBookEmail}
                      disabled={!bookEmail || !retentionChoice || bookSending}
                      style={{ opacity: bookEmail && retentionChoice && !bookSending ? 1 : 0.6 }}
                    >
                      {bookSending ? 'Sending…' : 'Email my book'}
                    </button>
                  )}
                  {bookSending && (
                    <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                      {sendStatus || 'Packaging your coloring book for email…'}
                    </p>
                  )}
                  {bookSent && (
                    <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '0.9rem', fontWeight: 700 }}>
                      PDF sent and cleanup complete. Check your email.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="section section--white">
        <div className="container" style={{ maxWidth: '900px' }}>
          <h2 className="section-heading">Expert coloring tips from professionals</h2>
          <h3 className="final-subtitle" style={{ marginBottom: '1.25rem' }}>
            You’ll get advice from top-level illustrators for working with colored pencils in general—plus photo-specific color building tips.
          </h3>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <img
              src="/images/generic-tips.png"
              alt="Example of expert coloring tips"
              style={{ maxWidth: '720px', width: '100%', borderRadius: '16px', boxShadow: '0 18px 35px rgba(0,0,0,0.08)' }}
            />
          </div>
        </div>
      </section>

      <section className="section section--white">
        <div className="container" style={{ maxWidth: '900px' }}>
          <h2 className="section-heading">Coloring book FAQs</h2>
          <h3 className="faq-subtitle">Quick answers for multi-photo books.</h3>
          <div className="faq-list">
            {[
              {
                q: 'Can I rearrange photos after upload?',
                a: 'Uploads are processed in the order you add them. If you need a new order, re-upload in the sequence you want.',
              },
              {
                q: 'Why would I want to add titles to my photos?',
                a: "The default title for each 'palette and tips' page comes from the photo's filename, which is often something obscure like “img3970.png.” Adding a title makes the book feel intentional and descriptive.",
              },
              {
                q: 'How big can my book be?',
                a: 'Up to 10 photos per book. Each photo becomes a line art page with a paired tips page.',
              },
              {
                q: 'Will you keep my files?',
                a: 'You choose. Either delete after send or keep for 30 days so you can re-download.',
              },
              {
                q: 'What paper should I use?',
                a: '80–100 lb paper works great. Print double-sided to keep line art on the right-hand page.',
              },
            ].map((item, idx) => (
              <div key={item.q} className="faq-item">
                <button
                  className="faq-question"
                  onClick={() => setOpenStudioFaq(openStudioFaq === idx ? null : idx)}
                  aria-expanded={openStudioFaq === idx}
                  aria-controls={`studio-faq-${idx}`}
                >
                  {item.q}
                  <span style={{ marginLeft: 'auto', fontWeight: 700 }}>{openStudioFaq === idx ? '−' : '+'}</span>
                </button>
                {openStudioFaq === idx && (
                  <p id={`studio-faq-${idx}`} className="faq-answer">
                    {item.a}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--tint">
        <div className="container" style={{ maxWidth: '900px' }} id="print-tips">
          <h2 className="section-heading" style={{ marginBottom: '0.75rem' }}>Print &amp; bind tips</h2>
          <h3 className="final-subtitle">Your book is delivered as a PDF. Here’s how to make it look professional at home or at a print shop.</h3>
          <ul style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--color-text-secondary)', lineHeight: 1.6, fontSize: '0.95rem' }}>
            <li style={{ marginBottom: '0.45rem' }}>Paper: use 80–100 lb paper to avoid bleed-through and give your pencils a premium feel.</li>
            <li style={{ marginBottom: '0.45rem' }}>Printing: double-sided keeps the layout with line art on the right; consider borderless for full page art.</li>
            <li style={{ marginBottom: '0.45rem' }}>Binding: use a coil/comb or 3-hole punch; add a thick cover if you like.</li>
            <li style={{ marginBottom: '0.45rem' }}>Home printing: check “actual size” and high-quality mode; use a fresh black cartridge for clean lines.</li>
            <li style={{ marginBottom: '0.45rem' }}>Print shops: send the PDF as-is; ask for heavier stock and a light laminate cover if desired.</li>
          </ul>
        </div>
      </section>

      <section className="section section--final">
        <div className="container final-heading">
          <h2 className="section-heading">Digital photos can pile up out of sight. Turn yours into something you can hold.</h2>
          <h3 className="final-subtitle">Take your memories off the screen and onto your table tonight.</h3>

          <div className="final-grid">
            <div className="final-grid-item">
              <p className="final-grid-item-title">Personal</p>
              <p>Built from your own photos, not stock images.</p>
            </div>
            <div className="final-grid-item">
              <p className="final-grid-item-title">Thoughtful</p>
              <p>Designed for colored pencils, quiet time, and real focus.</p>
            </div>
            <div className="final-grid-item">
              <p className="final-grid-item-title">Fast</p>
              <p>Up to 10 pages in minutes, ready to print and color.</p>
            </div>
          </div>
          <div className="hero-cta">
            <a href="#studio-console" className="btn-primary" onClick={() => creatorRef.current?.scrollIntoView({ behavior: 'smooth' })}>
              Start my book
            </a>
            <p className="inline-cta-meta">
              If you’re done coloring generic designs, start with photos that still make you feel something.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
