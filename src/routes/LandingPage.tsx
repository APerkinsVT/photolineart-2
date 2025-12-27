import { useEffect, useMemo, useState, useRef } from 'react';
import { Download } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { generateLineArt } from '../services/aiService';
import { downloadPdfForItem, buildPdfDataUrlForItem } from '../services/pdfService';
import { requestUploadTarget, uploadFileToBlob } from '../services/blobService';
import type { LineArtAnalysis } from '../types/ai';
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

type ReadyLineArt = {
  lineArtUrl: string;
  analysis: LineArtAnalysis;
  generationType?: 'free' | 'credit';
  creditsRemaining?: number;
};

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
  const [creditsModalOpen, setCreditsModalOpen] = useState(false);
  const [creditsCheckoutLoading, setCreditsCheckoutLoading] = useState(false);
  const [creditsRemaining, setCreditsRemaining] = useState<number | null>(null);
  const [generationType, setGenerationType] = useState<'free' | 'credit' | ''>('');
  const [feedback, setFeedback] = useState<FeedbackState>({ message: '', type: '' });
  const [result, setResult] = useState<ReadyLineArt | null>(null);
  const [status, setStatus] = useState<StatusState>('idle');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [emailError, setEmailError] = useState('');
  const location = useLocation();
  const statusTimers = useRef<number[]>([]);
  const resultAnalysis = result?.analysis;
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
  const buildSegmentLink = (value: string) => `/?seg=${encodeURIComponent(value)}#hero-form`;

  const fcPaletteMap = useMemo(() => {
    const map: Record<string, FCPaletteEntry> = {};
    fcPalette.forEach((entry) => {
      map[String(entry.id)] = entry;
    });
    return map;
  }, [fcPalette]);

  const segment = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const raw = new URLSearchParams(location.search).get('seg');
    return raw ? raw.trim().toLowerCase() : '';
  }, [location.search]);

  const creditsStatus = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return new URLSearchParams(location.search).get('credits') ?? '';
  }, [location.search]);

  const creditsEmail = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return new URLSearchParams(location.search).get('email') ?? '';
  }, [location.search]);

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
    trackEvent('PageView_Landing', 'page_view', {
      page_title: 'Landing',
      page_path: typeof window !== 'undefined' ? window.location.pathname : '/',
    });
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

  useEffect(() => {
    if (!location.hash) return;
    const id = location.hash.replace('#', '');
    if (!id) return;
    const handle = window.setTimeout(() => {
      const target = document.getElementById(id);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 0);
    return () => window.clearTimeout(handle);
  }, [location.hash]);

  useEffect(() => {
    if (!creditsStatus) return;
    if (creditsStatus === 'success') {
      setFeedback({ message: 'Credits added! You can generate your next page now.', type: 'success' });
    } else if (creditsStatus === 'cancelled') {
      setFeedback({ message: 'Checkout cancelled. You can try again anytime.', type: 'error' });
    }
  }, [creditsStatus]);

  useEffect(() => {
    if (creditsEmail && !email) {
      setEmail(creditsEmail);
    }
  }, [creditsEmail, email]);

  useEffect(() => {
    if (!creditsModalOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeCreditsModal();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKey);
    };
  }, [creditsModalOpen]);

  const buildPhotoItemFromResult = (res: ReadyLineArt): PhotoItem => {
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
    if (!email.trim()) {
      setEmailError('Please enter your email to continue.');
      setFeedback({ message: 'Please enter your email to continue.', type: 'error' });
      return;
    }
    setEmailError('');
    trackEvent(photo ? 'LP_GetLineArt' : 'LP_CreateFreePage', 'lp_form_submit', { has_photo: !!photo });

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
    setCreditsModalOpen(false);
    setGenerationType('');
    setCreditsRemaining(null);
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
        email: email.trim(),
        context: 'single',
        options: {
          prompt:
            'Convert this exact photo into clean black line art for a coloring book. Preserve composition and subjects; outlines only; minimal interior shading; white background.',
          setSize: 120,
        },
      });

      if (response.status === 'no_credits') {
        setFeedback({
          message: 'You’ve used your free page. Grab a 3‑page pack to keep going.',
          type: 'error',
        });
        setStatus('idle');
        setCreditsModalOpen(true);
        return;
      }

      const nextType =
        response.generationType === 'free' || response.generationType === 'credit'
          ? response.generationType
          : '';
      const nextCredits = typeof response.creditsRemaining === 'number' ? response.creditsRemaining : null;
      if (!response.lineArtUrl || !response.analysis) {
        throw new Error('Line art response missing required data.');
      }

      setStatus('finalizing');
      setGenerationType(nextType);
      setCreditsRemaining(nextCredits);
      setResult({
        lineArtUrl: response.lineArtUrl,
        analysis: response.analysis,
        generationType: nextType || undefined,
        creditsRemaining: nextCredits ?? undefined,
      });
      setFeedback({
        message: 'Success! Your file and color guide have been generated!',
        type: 'success',
      });
      setStatus('ready');
      setPhoto(null);
      setCustomTitle('');
    } catch (error: unknown) {
      console.error('Generation failed:', error);
      let msg = 'Something went wrong. Please try again.';
      if (error instanceof Error && (error.message.includes('502') || error.message.includes('Failed to fetch'))) {
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

  const openCreditsModal = () => {
    setCreditsModalOpen(true);
    trackEvent('LP_CreditsModalOpen', 'lp_credits_modal_open');
  };

  const closeCreditsModal = () => {
    setCreditsModalOpen(false);
  };

  const startCreditsCheckout = async () => {
    if (!email.trim()) {
      setEmailError('Please enter your email to continue.');
      return;
    }
    if (result && !downloadComplete) {
      const ok = await handleFreeDownload();
      if (!ok) {
        return;
      }
    }
    try {
      setCreditsCheckoutLoading(true);
      trackEvent('LP_CreditsCheckoutStart', 'lp_credits_checkout_start', { offer: 'credits3' });
      const resp = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), offer: 'credits3' }),
      });
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(text || 'Unable to start checkout');
      }
      const data = await resp.json();
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('Missing checkout URL');
      }
    } catch (err) {
      console.error('Credits checkout failed', err);
      setFeedback({
        message: 'Unable to start checkout right now. Please try again.',
        type: 'error',
      });
    } finally {
      setCreditsCheckoutLoading(false);
    }
  };

  const handleFreeDownload = async (): Promise<boolean> => {
    if (!email.trim()) {
      setEmailError('Please enter your email to continue.');
      return false;
    }
    if (!result || !resultAnalysis) return false;
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
            to: email.trim(),
            pdfBase64: dataUrl,
            filename: fileName,
            subject: 'Your PhotoLineArt coloring page',
            optIn: newsletterOptIn,
            rating: rating || undefined,
            source: 'single',
            segment: segment || undefined,
            text: [
              'Your coloring page is ready. The PDF is attached.',
              'Want more pages? Grab a 3‑page pack any time at photolineart.com.',
              '',
              'Privacy first: we delete your uploaded photo and generated line art right after sending this download.',
              'If you ever want to make another page, just upload again.',
            ].join('\n'),
          }),
        });
      } catch (mailErr) {
        console.warn('Email send failed (continuing):', mailErr);
      }
      try {
        const urlsToDelete: string[] = [];
      if (resultAnalysis.sourceImageUrl) urlsToDelete.push(resultAnalysis.sourceImageUrl);
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
      return true;
    } catch (err) {
      console.error('Download failed', err);
      setFeedback({
        message: 'Unable to generate PDF right now. Please try again.',
        type: 'error',
      });
      return false;
    } finally {
      setIsDownloading(false);
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
            <a className="site-nav-link" href="/about">
              About
            </a>
            {/* <a className="site-nav-link site-nav-login" href="#login">
              Login
            </a> */}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="section section--base">
        <div className="container hero">
          <div className="hero-inner">
            <h1 className="hero-heading">Turn your favorite photos into printable coloring pages.</h1>

            <p className="hero-lead">
              Upload a photo and we turn it into high-resolution line art, plus specific{' '}
              <strong>Faber-Castell pencil numbers</strong> and expert tips. Not generic patterns—your moments, on paper.
            </p>
            <p className="hero-lead">
              Your first page is <strong>FREE</strong> — extra pages are <strong>3 for $5</strong>.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', margin: '18px auto 20px' }}>
              <img
                src="/images/corgi-dog-with-line-art.png"
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

            <ul className="hero-bullets">
              <li><strong>Transform</strong> real moments — family, travel, pets — into pages you’ll actually want
                to color. Travelers, hobbyists, pet owners, and families can re-live their memories in this mindful activity.</li>
              <li>Get specific color guidance matched to your exact photo and Faber-Castell pencil set.</li>
              <li>Download a print-ready PDF and start coloring today.</li>
            </ul>

            <p className="hero-meta">No card for your first page. One photo. About 2 minutes.</p>
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
                        src={resultAnalysis?.sourceImageUrl}
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
                    onClick={() => {
                      if (!downloadComplete) {
                        trackEvent('LP_DownloadClick', 'lp_download_click', { email: !!email });
                      }
                    }}
                    >
                      Expert Tips
                    </h3>
                    <div style={{ display: 'grid', gap: '0.75rem', maxHeight: '320px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                      {(resultAnalysis?.tips ?? []).map((tip, i) => (
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
                            const win = window as { gtag?: (event: string, action: string, params: Record<string, unknown>) => void };
                            if (typeof window !== 'undefined' && win.gtag) {
                              win.gtag('event', 'rating_submit', {
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
                    <button
                      className="btn-primary"
                      type="button"
                      disabled={isDownloading}
                      onClick={async () => {
                        if (downloadComplete) {
                          setResult(null);
                          setDownloadComplete(false);
                          setGenerationType('');
                          setCreditsRemaining(null);
                          return;
                        }
                        await handleFreeDownload();
                      }}
                      style={{
                        opacity: !isDownloading ? 1 : 0.6,
                        cursor: !isDownloading ? 'pointer' : 'not-allowed',
                      }}
                    >
                      <Download size={18} style={{ marginRight: '0.5rem' }} />
                      {downloadComplete
                        ? isDownloading
                          ? 'Deleting your originals…'
                          : 'Create another'
                        : isDownloading
                          ? 'Preparing PDF...'
                          : 'Download your page'}
                    </button>
                    {generationType === 'credit' && typeof creditsRemaining === 'number' && (
                      <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                        You have {creditsRemaining} page{creditsRemaining === 1 ? '' : 's'} remaining.
                      </div>
                    )}
                    {generationType === 'free' && (
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={openCreditsModal}
                      >
                        Get 3 more pages for $5
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <h3 className="hero-form-title">Start with a photo you love</h3>

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
                      onChange={(e) => {
                        const file = e.target.files ? e.target.files[0] : null;
                        if (file) {
                          trackEvent('LP_ChooseFile', 'lp_choose_file', { name: file.name });
                        }
                        setPhoto(file);
                      }}
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

                  <div className="form-field">
                    <label className="form-label" htmlFor="email">
                      Email for your download
                    </label>
                    <input
                      className="input-text"
                      id="email"
                      name="email"
                      type="email"
                      placeholder="you@email.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (emailError) setEmailError('');
                      }}
                      required
                    />
                    {emailError ? (
                      <p className="form-hint" style={{ color: '#b91c1c' }}>
                        {emailError}
                      </p>
                    ) : (
                      <p className="form-hint">We’ll email your PDF and keep your page private.</p>
                    )}
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem',
                        fontSize: '0.9rem',
                        color: 'var(--color-text-primary)',
                        fontWeight: 500,
                        marginTop: '0.6rem',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={newsletterOptIn}
                        onChange={(e) => setNewsletterOptIn(e.target.checked)}
                        style={{ width: '16px', height: '16px' }}
                      />
                      <span>Send me advanced coloring ideas and new layout styles</span>
                    </label>
                  </div>

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
                      {isLoading ? 'Processing...' : photo ? 'Get my line art' : 'Create my free coloring page'}
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
                    style={{ color: 'var(--color-cta-primary)', fontWeight: 600 }}
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
                onClick={() => {
                  setResult(null);
                  setGenerationType('');
                  setCreditsRemaining(null);
                }}
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
          <h2 className="section-heading">Why this coloring book won't end up on a shelf</h2>
          <h3 className="problem-subtitle">It activates your heart... not just your hands.</h3>

          <p className="problem-intro">
            Most “adult coloring books,” help you relax… but their scenes and drawings are unfamiliar to you. Without emotional resonance, it's easy for boredom to overtake your calm and the book to disappear into a
            drawer.
          </p>

          <div className="problem-grid">
            <div className="problem-card">
              <p className="problem-card-title">Specific memories</p>
              <p className="problem-card-text">You’re working with your own memories, not someone else’s vision.</p>
            </div>
            <div className="problem-card">
              <p className="problem-card-title">Refined focus</p>
              <p className="problem-card-text">
                Coloring books often focus on simple lines rather than capturing the details of real photographic images .
              </p>
            </div>
            <div className="problem-card">
              <p className="problem-card-title">Soothing ritual</p>
              <p className="problem-card-text">After a week, spending time with these books and their memories can become a ritual.</p>
            </div>
          </div>

          <p className="problem-outro">
            Picture this: your grandmother’s kitchen, your dog on that favorite trail, or the café from your
            last big trip—quietly waiting on the page, ready to be brought back to life, stroke by stroke.
          </p>
        </div>
      </section>

      {/* Book teaser */}
      <section className="section section--base">
        <div className="container" style={{ textAlign: 'center', maxWidth: '860px' }}>
          <h2 className="section-heading" style={{ marginBottom: '2.4rem' }}>
            Want a full 6‑photo gift book?
          </h2>
          <div
            style={{
              width: '100%',
              maxWidth: '640px',
              margin: '0 auto 1rem auto',
              border: '1px dashed var(--color-text-secondary)',
              borderRadius: '12px',
              background: 'var(--color-base)',
              minHeight: '260px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-text-secondary)',
              fontWeight: 600,
            }}
          >
          <img
                src="/images/coloring-book-sample.jpg"
                alt="Example coloring book pages"
                style={{
                  maxWidth: '520px',
                  width: '100%',
                  borderRadius: '14px',
                  boxShadow: '0 18px 35px rgba(0,0,0,0.08)',
                  margin: '0 auto',
                }}></img>
          </div>
          <p className="problem-subtitle" style={{ marginBottom: '1rem' }}>
            Upload up to 6 photos → get a printable book, ready for binding and gifting.
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
            <span>Includes a link and QR code so you can re-download anytime.</span>
            <span>Pages follow your upload order—no extra steps required.</span>
          </div>
          <a
            href="/studio"
            className="btn-primary"
            onClick={() => trackEvent('LP_SeeBooks', 'lp_see_books')}
          >
            Learn more about the book
          </a>
        </div>
      </section>

      {/* Who uses PhotoLineArt */}
      <section id="who-uses" className="section section--white">
        <div className="container who-uses">
          <h2 className="section-heading">Who uses PhotoLineArt?</h2>
          <h3 className="who-uses-subtitle">Four ways people turn personal photos into pages worth coloring.</h3>

          <div className="segment-grid">
            <article id="families" className="segment-card">
              <div className="segment-image">
                <img src="/images/mother-daughter.jpg" alt="Mother and daughter coloring page example" />
              </div>
              <h4>For parents & grandparents</h4>
              <p>
                Turn everyday family moments into pages you can color together or gift to grandparents. Simple, heartfelt, 
                easy to print.
              </p>
              <a
                className="btn-secondary"
                href={buildSegmentLink('families')}
                onClick={() => trackEvent('LP_SegmentFamilies', 'lp_segment_families')}
              >
                Create a family page
              </a>
            </article>

            <article id="couples" className="segment-card">
              <div className="segment-image">
                <img src="/images/couple.jpg" alt="Couples photo coloring page example" />
              </div>
              <h4>For couples & anniversaries</h4>
              <p>
                Give your favorite photo the slow, thoughtful treatment. Perfect for anniversaries, weddings, or a shared date
                night ritual.
              </p>
              <a
                className="btn-secondary"
                href={buildSegmentLink('couples')}
                onClick={() => trackEvent('LP_SegmentCouples', 'lp_segment_couples')}
              >
                Create a couples page
              </a>
            </article>

            <article id="pets" className="segment-card">
              <div className="segment-image">
                <img src="/images/frisbee-dog.jpg" alt="Pet photo coloring page example" />
              </div>
              <h4>For pets as family</h4>
              <p>
                Capture the pose you love most. Detailed line art makes fur, markings, and eyes feel alive without turning
                into clip art.
              </p>
              <a
                className="btn-secondary"
                href={buildSegmentLink('pets')}
                onClick={() => trackEvent('LP_SegmentPets', 'lp_segment_pets')}
              >
                Create a pet page
              </a>
            </article>

            <article id="places" className="segment-card">
              <div className="segment-image">
                <img src="/images/dory-photo-preview.jpg" alt="Special place coloring page example" />
              </div>
              <h4>For special places</h4>
              <p>
                Retreats, cabins by the lake, favorite cafés. Turn a place into a quiet, printable memory you can color
                and keep.
              </p>
              <a
                className="btn-secondary"
                href={buildSegmentLink('places')}
                onClick={() => trackEvent('LP_SegmentPlaces', 'lp_segment_places')}
              >
                Create a places page
              </a>
            </article>
          </div>
        </div>
      </section>

      {/* Solution / how it works */}
      <section id="how-it-works" className="section section--white">
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
                Your best moments are buried in phone backups and old albums. They’re important to you, but <strong>rarely seen.</strong>
              </p>
              <hr />
              <p className="solution-panel-label" style={{ color: 'var(--color-cta-primary)', marginTop: '0.75rem' }}>
                After
              </p>
              <p>
                PhotoLineArt turns those same moments into gallery-quality line drawings with color guides. You slow down. You remember. You create something{' '}
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
            <a
              href="#hero-form"
              className="btn-primary"
              onClick={() => trackEvent('LP_DownloadCTA', 'lp_download_cta')}
            >
              Create my free coloring page
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

      {/* Social proof */}
      <section id="examples" className="section section--white">
        <div className="container social-proof-heading">
          <h2 className="section-heading">What people are coloring with PhotoLineArt</h2>
          <h3 className="social-proof-subtitle">Real photos. Real pages. Real rituals.</h3>

          <div className="testimonials">
            <blockquote className="testimonial">
              <p>
                “In one evening I turned family photos into pages my sister and I color together on zoom. It's like visiting our
                childhood.”
              </p>
              <footer>— Elena K., 52, Seattle</footer>
            </blockquote>
            <blockquote className="testimonial">
              <p>
                “I made a small book from some honeymoon pictures. We colored one page every Sunday.”
              </p>
              <footer>— Marcus L., 38, Chicago</footer>
            </blockquote>
            <blockquote className="testimonial">
              <p>
                “I’m not an artist, so the tips helped me know exactly which pencils to use. The pages look grown-up, not cutesy or cartoonish.”
              </p>
              <footer>— Priya S., 47, Boston</footer>
            </blockquote>
          </div>

          <div className="stats">
            <div className="stats-inner">
              <p className="stat">
                <span>100's</span> of pages created... hours of <span>memories</span>
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

      {/* FAQ */}
      <section id="faq" className="section section--base">
        <div className="container faq-heading">
          <h2 className="section-heading">Questions before you trust us with your favorite photos</h2>
          <h3 className="faq-subtitle">Fair. Here are straight answers.</h3>

          <div className="faq-list">
            {[
              {
                q: 'Will the line art really look like my photo?',
                a: 'Yes. The model is trained to preserve faces and key details, not blur them. You’ll see a preview based on your actual photo before you download.',
              },
              {
                q: 'Is this going to feel childish?',
                a: 'No. There are no cartoon characters or clip-art backgrounds. The pages are designed for adults who like detail, subtle shading, and slower work with real artist-quality pencils.',
              },
              {
                q: 'I’m not an artist. Is this too advanced?',
                a: 'If you can color inside a line, you’re fine. Each page includes practical tips and specific pencil suggestions.',
              },
              {
                q: 'What happens to my photos?',
                a: 'Your images are encrypted in transit and used only to generate your art and tips. We don’t sell your data. For single photo pages, we delete your photos and files right after creating your pdf. For multiple-photo coloring books, you will have a choice to delete immediately, or keep the pdf files for 30 days.',
              },
              {
                q: 'How do I print and bind my pages?',
                a: 'Your file is ready for standard letter/A4. Print on heavier paper (80 lb. works well) or email it to a local print/office shop and ask for simple spiral or comb binding.',
              },
              {
                q: 'What exactly do I get in the free trial?',
                a: 'You get a two-page pdf file for each photo: the full-page detailed line art, and a companion page with original photo and detailed color-specific tips.',
              },
            ].map((item, index) => (
              <div key={item.q} className="faq-item">
                <button
                  className="faq-question"
                  onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
                  aria-expanded={openFaqIndex === index}
                  aria-controls={`faq-answer-${index}`}
                >
                  {item.q}
                  <span style={{ marginLeft: 'auto', fontWeight: 700 }}>{openFaqIndex === index ? '−' : '+'}</span>
                </button>
                {openFaqIndex === index && (
                  <p id={`faq-answer-${index}`} className="faq-answer">
                    {item.a}
                  </p>
                )}
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
              Create my free coloring page
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
            <a href="/about">About</a>
            <span>|</span>
            <a href="#how-it-works">How it works</a>
            <span>|</span>
            <a href="/privacy">Privacy</a>
            <span>|</span>
            <a href="/terms">Terms</a>
            <span>|</span>
            <a href="/contact">Contact</a>
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

      {creditsModalOpen && (
        <div
          className="modal-overlay"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeCreditsModal();
            }
          }}
        >
          <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="credits-title">
            <button type="button" className="modal-close" onClick={closeCreditsModal} aria-label="Close">
              ×
            </button>
            <h3 id="credits-title" className="modal-title">
              Need more pages?
            </h3>
            <p className="modal-subtitle">
              Get 3 more single-photo pages for $5. Credits stay tied to your email so you can come back anytime.
            </p>
            <div style={{ display: 'grid', gap: '0.65rem' }}>
              <label htmlFor="credits-email" style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                Email for your credits
              </label>
              <input
                id="credits-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError('');
                }}
                placeholder="you@email.com"
                style={{
                  width: '100%',
                  borderRadius: '0.6rem',
                  border: '1px solid var(--color-border)',
                  padding: '0.7rem 0.9rem',
                  fontSize: '0.95rem',
                }}
                required
              />
              {emailError && (
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#b91c1c' }}>{emailError}</p>
              )}
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                You’ll be able to use credits whenever you upload a new photo.
              </p>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                Have a promo code? You can add it on the Stripe checkout page.
              </p>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn-primary"
                onClick={startCreditsCheckout}
                disabled={!email.trim() || creditsCheckoutLoading}
              >
                {creditsCheckoutLoading ? 'Starting checkout…' : 'Get 3 pages for $5'}
              </button>
              <button type="button" className="btn-secondary" onClick={closeCreditsModal}>
                Maybe later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
