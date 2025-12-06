import { useEffect, useMemo, useState, useRef } from 'react';
import { Download } from 'lucide-react';
import { generateLineArt } from '../services/aiService';
import { downloadPdfForItem, buildPdfDataUrlForItem } from '../services/pdfService';
import { requestUploadTarget, uploadFileToBlob } from '../services/blobService';
import type { LineArtResponse } from '../types/ai';
import type { PhotoItem } from '../types/photo';

type FCPaletteEntry = {
  id: string | number;
  name: string;
  hex: string;
  swatchFilename: string;
};

type FeedbackType = 'error' | 'success' | 'processing' | '';
type FeedbackState = {
  message: string;
  type: FeedbackType;
};

type StatusState =
  | 'idle'
  | 'uploading'
  | 'analyzing'
  | 'extracting'
  | 'rendering'
  | 'palette'
  | 'matching'
  | 'tips'
  | 'finalizing'
  | 'ready'
  | 'error';

export function LandingPage() {
  const [email, setEmail] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [customTitle, setCustomTitle] = useState('');
  const [originalFileName, setOriginalFileName] = useState('');
  const [fcPalette, setFcPalette] = useState<FCPaletteEntry[]>([]);
  const [newsletterOptIn, setNewsletterOptIn] = useState(false);
  const [downloadComplete, setDownloadComplete] = useState(false);
  const [rating, setRating] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>({ message: '', type: '' });
  const [result, setResult] = useState<LineArtResponse | null>(null);
  const [status, setStatus] = useState<StatusState>('idle');
  const statusTimers = useRef<number[]>([]);

  const fcPaletteMap = useMemo(() => {
    const map: Record<string, FCPaletteEntry> = {};
    fcPalette.forEach((entry) => {
      map[String(entry.id)] = entry;
    });
    return map;
  }, [fcPalette]);

  const statusMessages: Record<StatusState, string> = {
    idle: '',
    uploading: 'Uploading your photo and checking the file...',
    analyzing: 'Deep analysis of the photo composition...',
    extracting: 'Extracting clean edges and contour lines...',
    rendering: 'Verifying fidelity and rendering clean line art...',
    palette: 'Generating color palette',
    matching: 'Matching Faber-Castel pencil colors',
    tips: 'Adding expert coloring tips',
    finalizing: 'Polishing final palette and expert coloring tips...',
    ready: '',
    error: 'We ran into an issue. Please try again.',
  };

  useEffect(() => {
    return () => {
      statusTimers.current.forEach((id) => window.clearTimeout(id));
      statusTimers.current = [];
    };
  }, []);

  useEffect(() => {
    async function loadPalette() {
      try {
        const res = await fetch('/palettes/faber-castell-polychromos.json');
        if (!res.ok) return;
        const data: FCPaletteEntry[] = await res.json();
        setFcPalette(data);
      } catch (err) {
        console.warn('Failed to load Faber-Castell palette', err);
      }
    }
    loadPalette();
  }, []);

  const buildPhotoItemFromResult = (res: LineArtResponse): PhotoItem => {
    const fileNameFromUrl =
      originalFileName || photo?.name || res.analysis.sourceImageUrl?.split('/').pop() || 'photolineart';
    const fallbackSize = photo?.size ?? 0;
    return {
      id: `inline-${Date.now()}`,
      fileName: fileNameFromUrl,
      originalSize: fallbackSize,
      preparedSize: fallbackSize,
      mimeType: photo?.type ?? 'image/jpeg',
      previewUrl: res.analysis.sourceImageUrl,
      referenceUrl: res.analysis.sourceImageUrl,
      lineArtUrl: res.lineArtUrl,
      analysis: res.analysis,
      progress: 100,
      state: 'ready',
      lastUpdated: Date.now(),
    };
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!photo) {
      setFeedback({ message: 'Please provide a photo.', type: 'error' });
      return;
    }

    const formatTitle = (val: string) => {
      const base = val.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ').trim();
      if (!base) return '';
      return base
        .split(' ')
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    };

    statusTimers.current.forEach((id) => window.clearTimeout(id));
    statusTimers.current = [];
    setIsLoading(true);
    setResult(null);
    setDownloadComplete(false);
    const formattedTitle = formatTitle(customTitle || photo.name || 'photolineart');
    setOriginalFileName(formattedTitle);
    setStatus('uploading');
    setFeedback({
      message: 'Uploading your photo...',
      type: 'processing',
    });

    try {
      const target = await requestUploadTarget({
        filename: photo.name,
        contentType: photo.type,
      });

      const imageUrl = await uploadFileToBlob(photo, target);

      setStatus('analyzing');
      const timers: number[] = [];
      timers.push(
        window.setTimeout(() => {
          setStatus((prev) => (prev === 'analyzing' ? 'extracting' : prev));
        }, 12000),
      );
      timers.push(
        window.setTimeout(() => {
          setStatus((prev) => (prev === 'extracting' ? 'rendering' : prev));
        }, 20000),
      );
      timers.push(
        window.setTimeout(() => {
          setStatus((prev) => (prev === 'rendering' ? 'palette' : prev));
        }, 30000),
      );
      timers.push(
        window.setTimeout(() => {
          setStatus((prev) => (prev === 'palette' ? 'matching' : prev));
        }, 36000),
      );
      timers.push(
        window.setTimeout(() => {
          setStatus((prev) => (prev === 'matching' ? 'tips' : prev));
        }, 42000),
      );
      statusTimers.current = timers;
      setFeedback({
        message: 'Generating your coloring page (this takes about 40-50s)...',
        type: 'processing',
      });

      const response = await generateLineArt({
        imageUrl,
        options: {
          prompt:
            'Convert this exact photo into clean black line art for a coloring book. Preserve composition and subjects; outlines only; minimal interior shading; white background.',
          setSize: 120,
        },
      });

      setStatus('finalizing');
      setResult(response);
      setFeedback({
        message: 'Success! Your file and color guide have been generated!',
        type: 'success',
      });
      setStatus('ready');
      setEmail('');
      setPhoto(null);
      setCustomTitle('');
    } catch (error: any) {
      console.error('Generation failed:', error);
      let msg = 'Something went wrong. Please try again.';
      if (error.message?.includes('502') || error.message?.includes('Failed to fetch')) {
        msg = 'Backend server unreachable. Please ensure the API server is running (port 3001).';
      }
      setFeedback({
        message: msg,
        type: 'error',
      });
      setStatus('error');
    } finally {
      statusTimers.current.forEach((id) => window.clearTimeout(id));
      statusTimers.current = [];
      setIsLoading(false);
    }
  };

  return (
    <div className="page">
      {/* Header */}
      <header className="site-header">
        <div className="container site-header-inner">
          <div className="wordmark">
            <span>Photo</span>
            <span>LineArt</span>
          </div>
          <nav className="site-nav">
            <a className="site-nav-link" href="#how-it-works">
              How it works
            </a>
            <a className="site-nav-link" href="#examples">
              Examples
            </a>
            <a className="site-nav-link site-nav-login" href="#login">
              Login
            </a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="section section--base">
        <div className="container hero">
          <div className="hero-inner">
            <h1 className="hero-heading">Turn your photo into a coloring page you’ll keep forever.</h1>

            <p className="hero-lead">
              In minutes, our AI turns a favorite photo into high-fidelity line art,{' '}
              <strong>complete with specific Faber-Castell color tips.</strong> Not generic patterns. Your
              life, on paper. First page is free.
            </p>

            <ul className="hero-bullets">
              <li>
                <strong>Transform</strong> real moments—family, pets, travel—into pages you’ll actually want
                to color.
              </li>
              <li>Get specific pencil guidance matched to your exact photo and Faber-Castell set.</li>
              <li>Download a print-ready PDF and start coloring tonight.</li>
            </ul>

            <div className="hero-cta">
              <a href="#hero-form" className="btn-primary">
                Turn my photo into a free page
              </a>
            </div>

            <p className="hero-meta">No card. One photo. About 2 minutes.</p>
          </div>

          {/* Hero form / result card */}
          <div id="hero-form" className="hero-form">
            {result ? (
              <div>
                <h3 className="hero-form-title">
                  {customTitle || originalFileName || 'Your Coloring Page is Ready!'}
                </h3>
                <div style={{ display: 'grid', gap: '1.25rem' }}>
                  <div style={{ overflow: 'hidden', borderRadius: '1rem', border: '1px solid var(--color-border)', background: '#f9fafb' }}>
                    <img
                      src={result.lineArtUrl}
                      alt="Generated Line Art"
                      style={{ width: '100%', height: 'auto', objectFit: 'contain', maxHeight: '420px', display: 'block' }}
                    />
                  </div>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <div style={{ width: '120px', height: '120px', overflow: 'hidden', borderRadius: '0.75rem', border: '1px solid var(--color-border)' }}>
                      <img
                        src={result.analysis.sourceImageUrl}
                        alt="Original Reference"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                    </div>
                  </div>

                  {(() => {
                    const resolvedPalette: FCPaletteEntry[] = (result?.analysis.palette ?? [])
                      .map((c) => {
                        const match = fcPaletteMap[String(c.fcNo)] || fcPaletteMap[String(c.fcName)];
                        return match || null;
                      })
                      .filter(Boolean) as FCPaletteEntry[];
                    return (
                      <div className="w-full max-w-2xl" style={{ margin: '0 auto' }}>
                        <h3
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            color: 'var(--color-text-secondary)',
                            marginBottom: '0.5rem',
                          }}
                        >
                          Color Palette
                        </h3>

                        <div
                          className="color-palette-row"
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(88px, 1fr))',
                            gap: '0.9rem 1.2rem',
                            justifyItems: 'center',
                            width: '100%',
                            maxWidth: '520px',
                            margin: '0 auto',
                            padding: '0 0.75rem',
                          }}
                        >
                          {resolvedPalette.map((p) => (
                            <div key={p.id} className="swatch-with-label">
                              <img
                                src={`/swatches/${p.swatchFilename}`}
                                alt={`FC ${p.id} ${p.name}`}
                                style={{ width: '48px', height: '32px', objectFit: 'contain' }}
                              />
                              <div className="swatch-label">FC {p.id}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}


                  <div className="w-full max-w-2xl" style={{ margin: '0 auto' }}>
                    <h3
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        color: 'var(--color-text-secondary)',
                        marginBottom: '0.5rem',
                      }}
                    >
                      Expert Tips
                    </h3>
                    <div style={{ display: 'grid', gap: '0.75rem', maxHeight: '320px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                      {result.analysis.tips.map((tip, i) => (
                        <div
                          key={i}
                          style={{
                            border: '1px solid #e5e7eb',
                            borderRadius: '0.75rem',
                            background: '#f9fafb',
                            padding: '0.75rem',
                            fontSize: '0.95rem',
                            color: 'var(--color-text-secondary)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
                            <span
                              style={{
                                width: '10px',
                                height: '10px',
                                borderRadius: '50%',
                                border: '1px solid rgba(0,0,0,0.1)',
                                background: tip.hex,
                                display: 'inline-block',
                              }}
                            />
                            <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{tip.region}</span>
                          </div>
                          <p style={{ margin: 0, lineHeight: 1.5 }}>{tip.tip}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ textAlign: 'center', marginTop: '1rem', marginBottom: '0.25rem' }}>
                    <div style={{ color: 'var(--color-text-secondary)', fontWeight: 700, marginBottom: '0.3rem' }}>
                      Rate your line art as a coloring page
                    </div>
                    <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => {
                            setRating(star);
                            if (typeof window !== 'undefined' && (window as any).gtag) {
                              (window as any).gtag('event', 'rating_submit', {
                                event_category: 'feedback',
                                event_label: 'lineart_rating',
                                value: star,
                              });
                            }
                          }}
                          aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                          style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '1.4rem',
                            cursor: 'pointer',
                            color: star <= rating ? '#f59e0b' : '#d1d5db',
                            padding: 0,
                          }}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gap: '0.5rem', marginTop: '1.25rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.95rem', color: 'var(--color-text-primary)', fontWeight: 500 }}>
                      <input
                        type="checkbox"
                        checked={newsletterOptIn}
                        onChange={(e) => setNewsletterOptIn(e.target.checked)}
                        style={{ width: '16px', height: '16px' }}
                      />
                      <span>Send me advanced coloring ideas and new layout styles</span>
                    </label>
                    <label htmlFor="download-email" style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      Enter email to receive your PDF + expert coloring tips
                    </label>
                    <input
                      id="download-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      style={{
                        width: '100%',
                        borderRadius: '0.6rem',
                        border: '1px solid var(--color-border)',
                        padding: '0.7rem 0.9rem',
                        fontSize: '0.95rem',
                      }}
                      required
                    />
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                      We’ll email the high-res PDF and tips. No spam, just your download link.
                    </p>
                    <button
                      className="btn-primary"
                      type="button"
                      disabled={(!email && !downloadComplete) || isDownloading}
                      onClick={async () => {
                        if (downloadComplete) {
                          setResult(null);
                          setDownloadComplete(false);
                          return;
                        }
                        if (!email || !result) return;
                        try {
                          setIsDownloading(true);
                          const item = buildPhotoItemFromResult(result);
                          await downloadPdfForItem(item, window.location.origin);
                          setDownloadComplete(true);
                          try {
                            const { dataUrl, fileName } = await buildPdfDataUrlForItem(item, window.location.origin);
                            await fetch('/api/send-pdf', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                to: email,
                                pdfBase64: dataUrl,
                                filename: fileName,
                                subject: 'Your PhotoLineArt coloring page',
                                optIn: newsletterOptIn,
                                rating: rating || undefined,
                                source: 'single',
                              }),
                            });
                          } catch (mailErr) {
                            console.warn('Email send failed (continuing):', mailErr);
                          }
                          try {
                            const urlsToDelete: string[] = [];
                            if (result.analysis.sourceImageUrl) urlsToDelete.push(result.analysis.sourceImageUrl);
                            if (result.lineArtUrl) urlsToDelete.push(result.lineArtUrl);
                            if (urlsToDelete.length > 0) {
                              await fetch('/api/delete-asset', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ urls: urlsToDelete }),
                              });
                            }
                          } catch (delErr) {
                            console.warn('Asset delete failed (continuing):', delErr);
                          }
                        } catch (err) {
                          console.error('Download failed', err);
                          setFeedback({
                            message: 'Unable to generate PDF right now. Please try again.',
                            type: 'error',
                          });
                        } finally {
                          setIsDownloading(false);
                        }
                      }}
                      style={{
                        opacity: (email && !isDownloading) || downloadComplete ? 1 : 0.6,
                        cursor: (email && !isDownloading) || downloadComplete ? 'pointer' : 'not-allowed',
                      }}
                    >
                      <Download size={18} style={{ marginRight: '0.5rem' }} />
                      {downloadComplete
                        ? isDownloading
                          ? 'Deleting your originals…'
                          : 'Create another'
                        : isDownloading
                          ? 'Preparing PDF...'
                          : 'Download Coloring Page'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <h3 className="hero-form-title">Start with one photo you love</h3>

                <form onSubmit={handleSubmit}>

                  <div className="form-field">
                    <label className="form-label" htmlFor="photo">
                      Upload your photo
                    </label>
                    <input
                      className="input-file"
                      id="photo"
                      name="photo"
                      type="file"
                      accept=".jpg,.jpeg,.png"
                      required
                      onChange={(e) => setPhoto(e.target.files ? e.target.files[0] : null)}
                    />
                    <p className="form-hint">JPG or PNG, up to 10 MB. Clear, well-lit photos work best.</p>
                  </div>

                  {photo && (
                    <div className="form-field">
                      <label className="form-label" htmlFor="title">
                        Optional title for your page
                      </label>
                      <input
                        className="input-text"
                        id="title"
                        name="title"
                        type="text"
                        placeholder="e.g., Sunset at the beach"
                        value={customTitle}
                        onChange={(e) => setCustomTitle(e.target.value)}
                      />
                      <p className="form-hint">We’ll use this as the page title. If left blank, we’ll use your file name.</p>
                    </div>
                  )}

                  {status !== 'idle' && status !== 'ready' && status !== 'error' && (
                    <div
                      style={{
                        marginTop: '1rem',
                        borderRadius: '0.75rem',
                        padding: '0.75rem 1rem',
                        background: 'rgba(29,92,99,0.08)',
                        color: 'var(--color-cta-primary)',
                        textAlign: 'center',
                        fontWeight: 600,
                        lineHeight: 1.4,
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {/* Spinner hidden */}
                          <span>{statusMessages[status]}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
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
                    </div>
                  )}

                  {status === 'error' && (
                    <div className="feedback-message" style={{ background: '#fee2e2', color: '#b91c1c' }}>
                      {statusMessages.error}
                    </div>
                  )}

                  {feedback.message && (
                    <div
                      className="feedback-message"
                      style={{
                        background:
                          feedback.type === 'error'
                            ? '#fee2e2'
                            : feedback.type === 'success'
                              ? '#dcfce7'
                              : '#e0f2fe',
                        color:
                          feedback.type === 'error'
                            ? '#b91c1c'
                            : feedback.type === 'success'
                              ? '#15803d'
                              : '#075985',
                      }}
                    >
                      {feedback.type === 'processing' && (
                        <span style={{ marginRight: '0.35rem' }}>⏳</span>
                      )}
                      {feedback.message}
                    </div>
                  )}

                  <div className="form-field">
                    <button
                      className="btn-primary"
                      type="submit"
                      disabled={isLoading}
                      style={{
                        marginTop: '1.25rem',
                        background: photo ? '#17494e' : undefined,
                      }}
                    >
                      {isLoading ? 'Processing...' : photo ? 'Get my line art' : 'Turn my photo into a free page'}
                    </button>
                  </div>
                </form>

                <p className="hero-form-footer">
                  Your photos stay private. They are deleted right after your page downloads.
                </p>
                <p className="hero-form-footer" style={{ marginTop: '0.35rem' }}>
                  Got feedback?{' '}
                  <a
                    href="mailto:team@photolineart.com?subject=PhotoLineArt%20feedback"
                    style={{ color: 'var(--color-cta-primary)', fontWeight: 700 }}
                  >
                    Tell us here
                  </a>
                </p>
              </div>
            )}
          </div>

          {result && (
            <div
              style={{
                marginTop: '1.2rem',
                padding: '1rem 1.25rem',
                background: '#f7f3ec',
                borderRadius: '0.9rem',
                border: '1px solid var(--color-border)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
                textAlign: 'center',
              }}
            >
              <div style={{ color: 'var(--color-text-secondary)', fontWeight: 700, marginBottom: '0.35rem' }}>
                Share on…
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: '0.45rem',
                  justifyContent: 'center',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  marginTop: '0.2rem',
                  marginBottom: '0.5rem',
                }}
              >
                <a
                  href="https://www.twitter.com/intent/tweet?text=I%20just%20turned%20a%20photo%20into%20line%20art%20with%20PhotoLineArt&url=https%3A%2F%2Fphotolineart.com"
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '36px',
                    height: '36px',
                    borderRadius: '999px',
                    border: '1px solid #d1d5db',
                    background: '#f9fafb',
                  }}
                >
                  <img src="/icons/X-logo-black.png" alt="X" style={{ width: 18, height: 18 }} />
                </a>
                <a
                  href="https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fphotolineart.com"
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '36px',
                    height: '36px',
                    borderRadius: '999px',
                    border: '1px solid #d1d5db',
                    background: '#f9fafb',
                  }}
                >
                  <img src="/icons/Facebook_Logo_Primary.png" alt="Facebook" style={{ width: 18, height: 18 }} />
                </a>
                <a
                  href="https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fphotolineart.com"
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '36px',
                    height: '36px',
                    borderRadius: '999px',
                    border: '1px solid #d1d5db',
                    background: '#f9fafb',
                  }}
                >
                  <img src="/icons/LI-Logo.png" alt="LinkedIn" style={{ width: 18, height: 18 }} />
                </a>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0.35rem' }}>
                <a
                  href="https://www.buymeacoffee.com/photolineart"
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    textDecoration: 'none',
                  }}
                >
                  <img
                    src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png"
                    alt="Buy Me A Coffee"
                    style={{ height: '36px', width: 'auto' }}
                  />
                </a>
              </div>
              <button
                type="button"
                onClick={() => setResult(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-text-secondary)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginTop: '0.7rem',
                }}
              >
                Create another
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Problem / agitation */}
      <section className="section section--white">
        <div className="container problem-section">
          <h2 className="section-heading">Why most adult coloring books end up on a shelf</h2>
          <h3 className="problem-subtitle">They calm your hands. Not your heart.</h3>

          <p className="problem-intro">
            You buy a beautiful “adult coloring book,” sit down to relax… and it’s page after page of random mandalas,
            forests, and quotes that mean nothing to you. You color a few, feel oddly flat, and the book disappears into a
            drawer.
          </p>

          <div className="problem-grid">
            <div className="problem-card">
              <p className="problem-card-title">Generic calm</p>
              <p className="problem-card-text">You’re coloring someone else’s idea of calm, not your own memories.</p>
            </div>
            <div className="problem-card">
              <p className="problem-card-title">Lacks refinement</p>
              <p className="problem-card-text">
                The art feels childish or noisy instead of thoughtful and refined.
              </p>
            </div>
            <div className="problem-card">
              <p className="problem-card-title">Disposable ritual</p>
              <p className="problem-card-text">After a week, the book is clutter, not a ritual.</p>
            </div>
          </div>

          <p className="problem-outro">
            Now picture this instead: your grandmother’s kitchen, your dog on that favorite trail, or the café from your
            last big trip—quietly waiting on the page, ready to be brought back to life, stroke by stroke.
          </p>
        </div>
      </section>

      {/* Book teaser */}
      <section className="section section--white">
        <div className="container" style={{ textAlign: 'center', maxWidth: '860px' }}>
          <p className="section-heading" style={{ marginBottom: '0.35rem' }}>
            Build a full coloring book from many photos
          </p>
          <p className="problem-subtitle" style={{ marginBottom: '1rem' }}>
            Upload up to 10 photos → get a printable book, portal link, and QR for gifting.
          </p>
          <div
            style={{
              display: 'grid',
              gap: '0.5rem',
              justifyItems: 'center',
              marginBottom: '0.75rem',
              color: 'var(--color-text-secondary)',
              fontSize: '0.95rem',
            }}
          >
            <span>Auto-published with a portal link and a QR so you can return anytime.</span>
            <span>Pages follow your upload order—no extra steps required.</span>
          </div>
          <a href="/studio" className="btn-primary">
            Build my coloring book
          </a>
        </div>
      </section>

      {/* Solution / how it works */}
      <section id="how-it-works" className="section section--base">
        <div className="container">
          <div className="solution-heading">
            <h2 className="section-heading">A coloring book made from your life</h2>
            <h3 className="solution-subtitle">
              Turn “lost in your camera roll” photos into a ritual you actually look forward to.
            </h3>
          </div>

          <div className="solution-layout">
            <div className="solution-panel">
              <p className="solution-panel-label">Before</p>
              <p>
                Your best moments are buried in phone backups and old albums. They’re important, but <strong>they are rarely seen.</strong>
              </p>
              <hr />
              <p className="solution-panel-label" style={{ color: 'var(--color-cta-primary)', marginTop: '0.75rem' }}>
                After
              </p>
              <p>
                PhotoLineArt turns those same moments into gallery-quality line drawings with guided colors. You slow down. You remember. You create something{' '}
                <strong>tangible.</strong>
              </p>
              <p
                style={{
                  fontSize: '0.875rem',
                  fontStyle: 'italic',
                  color: 'var(--color-text-secondary)',
                  marginTop: '1rem',
                }}
              >
                <span style={{ fontWeight: 600 }}>Bridge:</span> Upload one photo. We handle the line art, the layout, and Faber-Castell recommendations
                tuned to your exact image and pencil set.
              </p>
            </div>

            <div className="solution-steps">
              <div className="solution-step">
                <div className="solution-step-number">1</div>
                <h4 className="solution-step-title">Upload a favorite photo</h4>
                <p className="solution-step-text">
                  Choose a clear shot of a person, pet, place, or memory you don’t want to lose to the scroll.
                </p>
              </div>
              <div className="solution-step">
                <div className="solution-step-number">2</div>
                <h4 className="solution-step-title">We create the art and color map</h4>
                <p className="solution-step-text">
                  Our AI converts your photo into detailed line art and a companion page with Faber-Castell suggestions matched to your chosen set.
                </p>
              </div>
              <div className="solution-step">
                <div className="solution-step-number">3</div>
                <h4 className="solution-step-title">Download, print, and start coloring</h4>
                <p className="solution-step-text">
                  Get a high-resolution PDF sized for standard letter/A4. Print at home and start coloring the same day.
                </p>
              </div>
            </div>
          </div>

          <div className="inline-cta">
            <a href="#hero-form" className="btn-primary">
              Show me my photo as line art
            </a>
            <p className="inline-cta-meta">Free trial: download one full-resolution page + expert tips, no credit card.</p>
          </div>

          <div className="core-benefits">
            <div>
              <p className="core-benefit-title">Deeply personal</p>
              <p className="core-benefit-text">Every page starts with a real memory—family, pets, trips, tiny everyday scenes.</p>
            </div>
            <div>
              <p className="core-benefit-title">Built for colored pencils</p>
              <p className="core-benefit-text">Line weight, detail, and white space tuned for longer, focused sessions.</p>
            </div>
            <div>
              <p className="core-benefit-title">Guided, not guessed</p>
              <p className="core-benefit-text">Specific Faber-Castell pencil numbers for skin, sky, stone, foliage, and more.</p>
            </div>
            <div>
              <p className="core-benefit-title">Gift-ready in an afternoon</p>
              <p className="core-benefit-text">Print, bind, and wrap a book that is uniquely yours.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section id="examples" className="section section--white">
        <div className="container social-proof-heading">
          <h2 className="section-heading">What people are coloring with PhotoLineArt</h2>
          <h3 className="social-proof-subtitle">Real photos. Real pages. Real rituals.</h3>

          <div className="testimonials">
            <blockquote className="testimonial">
              <p>
                “In one evening I turned a folder of old family photos into six pages my sister and I now color together on video calls. It feels like visiting our
                childhood.”
              </p>
              <footer>— Elena K., 52, Seattle</footer>
            </blockquote>
            <blockquote className="testimonial">
              <p>
                “I made a small book from our honeymoon pictures. We color one page every Sunday. It’s our reset button.”
              </p>
              <footer>— Marcus L., 38, Chicago</footer>
            </blockquote>
            <blockquote className="testimonial">
              <p>
                “I’m not an artist, but the Faber-Castell tips told me exactly which pencils to use. The pages look grown-up, not cutesy. It lives on my coffee table,
                not in a box.”
              </p>
              <footer>— Priya S., 47, Boston</footer>
            </blockquote>
          </div>

          <div className="stats">
            <div className="stats-inner">
              <p className="stat">
                <span>1000's</span> of pages created
              </p>
              <p className="stat">
                <span>9/10</span> trial users color a page
              </p>
            </div>
          </div>

          <div className="inline-cta">
            <a href="#hero-form" className="btn-primary">
              Create my free coloring page
            </a>
            <p className="inline-cta-meta">Start with one photo that still makes you pause.</p>
          </div>
        </div>
      </section>

      {/* Differentiation / features */}
      <section className="section section--base">
        <div className="container feature-heading">
          <h2 className="section-heading">Why PhotoLineArt feels different the first time you use it</h2>
          <h3 className="feature-subtitle">Not an app to tap through. A tool you sit down with.</h3>

          <div className="features-grid">
            {[1, 2, 3, 4].map((num) => (
              <div key={num} className="feature-block">
                <h4 className="feature-title">
                  {num}.{' '}
                  {num === 1
                    ? 'Start with a meaningful color photo'
                    : num === 2
                      ? 'Color palettes extracted for each image'
                      : num === 3
                        ? 'Layouts designed for mindful adults'
                        : 'Book-ready pages you can reprint'}
                </h4>
                <div className="art-mock">
                  <div className="art-frame">
                    {num === 1 ? <img src="/images/dory-photo-preview.png" alt="My sailing dory" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : ''}
                    {num === 2 ? <img src="/images/color-palette-preview.png" alt="Artist pencil color palette" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : ''}
                    {num === 3 ? <img src="/images/dory-lineart-preview.png" alt="Balanced-detail lineart drawings" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : ''}
                    {num === 4 ? <img src="/images/pdf-ready-to-print-preview.png" alt="Print-ready PDF file" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : ''}
                  </div>
                </div>
                <p className="feature-text">
                  {num === 1
                    ? 'Our AI is tuned for faces, textures, and depth. You recognize the moment immediately—no harsh “cartoon filter” edges.'
                    : num === 2
                      ? 'Each page comes with a guide that calls out specific pencils. Choose your set size so you’re never guessing at tones.'
                      : num === 3
                        ? 'Pages are detailed but breathable. Balanced line weight keeps your mind engaged without turning the page into noise.'
                        : 'Receive a high-resolution PDF. Print at home or have it bound at a local shop—no shipping or waiting.'}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="section section--white">
        <div className="container faq-heading">
          <h2 className="section-heading">Questions before you trust us with your favorite photos</h2>
          <h3 className="faq-subtitle">Fair. Here are straight answers.</h3>

          <div className="faq-list">
            {[
              'Will the line art really look like my photo?',
              'Is this going to feel childish?',
              'I’m not an artist. Is this too advanced?',
              'What happens to my photos?',
              'How do I print and bind my pages?',
              'What exactly do I get in the free trial?',
            ].map((question, index) => (
              <div key={question} className="faq-item">
                <p className="faq-question">{question}</p>
                <p className="faq-answer">
                  {index === 0
                    ? 'Yes. The model is trained to preserve faces and key details, not blur them. You’ll see a preview based on your actual photo before you download.'
                    : index === 1
                      ? 'No. There are no cartoon characters or clip-art backgrounds. The pages are designed for adults who like detail, subtle shading, and slower work with real artist-quality pencils.'
                      : index === 2
                        ? 'If you can color inside a line, you’re fine. Each page includes practical tips and specific pencil suggestions.'
                        : index === 3
                          ? 'Your images are encrypted in transit and used only to generate your art and tips. We don’t sell your data, and we delete your photos and files after 24 hours.'
                          : index === 4
                            ? 'Your file is ready for standard letter/A4. Print on heavier paper (80 lb. works well) or email it to a local print/office shop and ask for simple spiral or comb binding.'
                            : 'You get a two-page pdf file for each photo: the full-page detailed line art, and a companion page with original photo and detailed color-specific tips.'}
                </p>
              </div>
            ))}
          </div>

          <div className="inline-cta">
            <a href="#hero-form" className="btn-primary">
              Create my free coloring page
            </a>
            <p className="inline-cta-meta">Start with one photo that still makes you pause.</p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="section section--final">
        <div className="container final-heading">
          <h2 className="section-heading">Your photos are piling up. Turn yours into something you can hold.</h2>
          <h3 className="final-subtitle">Take one memory off the screen and onto your table tonight.</h3>

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
              <p>One free page in minutes, ready to print and color.</p>
            </div>
          </div>

          <div className="inline-cta">
            <a href="#hero-form" className="btn-primary">
              Turn my photo into a free page
            </a>
            <p className="inline-cta-meta">
              If you’re done coloring generic designs, start with a single photo that still makes you feel something.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="site-footer">
        <div className="container">
          <nav className="footer-nav">
            <a href="#about">About</a>
            <span>|</span>
            <a href="#how-it-works">How it works</a>
            <span>|</span>
            <a href="#privacy">Privacy</a>
            <span>|</span>
            <a href="#terms">Terms</a>
            <span>|</span>
            <a href="#contact">Contact</a>
            <span>|</span>
            <a href="https://buymeacoffee.com/photolineart" target="_blank" rel="noreferrer">
              Buy us a coffee
            </a>
          </nav>
          <p className="footer-note">
            PhotoLineArt uses AI to help create line art and color guides from your photos. We treat your images and personal data with care. See our Privacy Policy
            for the details.
          </p>
        </div>
      </footer>
    </div>
  );
}
