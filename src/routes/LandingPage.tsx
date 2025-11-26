
import { generateLineArt } from '../services/aiService';
import { requestUploadTarget, uploadFileToBlob } from '../services/blobService';
import { useState } from 'react';
import {
  Menu, X, Check, ChevronDown, ChevronUp,
  Star, ScanLine, Palette, Flower2, Printer, Download, RefreshCw
} from 'lucide-react';
import type { LineArtResponse } from '../types/ai';

// ... (existing imports)

type FeedbackState = {
  message: string;
  type: 'error' | 'success' | 'processing' | '';
};

export function LandingPage() {
  const [email, setEmail] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>({ message: '', type: '' });
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [result, setResult] = useState<LineArtResponse | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email || !photo) {
      setFeedback({ message: 'Please provide both email and a photo.', type: 'error' });
      return;
    }

    setIsLoading(true);
    setFeedback({
      message: 'Uploading your photo...',
      type: 'processing',
    });

    try {
      // 1. Upload the photo
      const target = await requestUploadTarget({
        filename: photo.name,
        contentType: photo.type,
      });

      const imageUrl = await uploadFileToBlob(photo, target);

      setFeedback({
        message: 'Generating your coloring page (this takes about 20-30s)...',
        type: 'processing',
      });

      // 2. Generate Line Art & Tips
      const response = await generateLineArt({
        imageUrl,
        options: {
          prompt: 'Convert this exact photo into clean black line art for a coloring book. Preserve composition and subjects; outlines only; minimal interior shading; white background.',
          setSize: 120, // Default to full set
        },
      });

      setResult(response);
      setFeedback({
        message: 'Success! Your file and color guide have been generated!',
        type: 'success',
      });
      setEmail('');
      setPhoto(null);
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
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-brand/20">
      {/* Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white">
              <ScanLine className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900">PhotoLineArt</span>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            <a href="#how-it-works" className="text-sm font-medium text-slate-600 hover:text-brand transition-colors">How it works</a>
            <a href="#examples" className="text-sm font-medium text-slate-600 hover:text-brand transition-colors">Examples</a>
            <a href="#faq" className="text-sm font-medium text-slate-600 hover:text-brand transition-colors">FAQ</a>
          </nav>

          <div className="hidden md:flex items-center gap-4">
            <a href="#hero-form" className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-700">
              Get Started
            </a>
          </div>

          <button
            className="md:hidden p-2 text-slate-600"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="absolute top-16 left-0 right-0 border-b border-slate-200 bg-white p-4 md:hidden shadow-xl">
            <nav className="flex flex-col gap-4">
              <a href="#how-it-works" className="text-base font-medium text-slate-600" onClick={() => setMobileMenuOpen(false)}>How it works</a>
              <a href="#examples" className="text-base font-medium text-slate-600" onClick={() => setMobileMenuOpen(false)}>Examples</a>
              <a href="#faq" className="text-base font-medium text-slate-600" onClick={() => setMobileMenuOpen(false)}>FAQ</a>
              <hr className="border-slate-100" />
              <a href="#hero-form" className="text-base font-bold text-brand" onClick={() => setMobileMenuOpen(false)}>Get Started</a>
            </nav>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-32 pb-20 lg:pt-48 lg:pb-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            {/* Left Column: Text */}
            <div className="max-w-2xl text-center lg:text-left mx-auto lg:mx-0">
              <div className="inline-flex items-center rounded-full border border-brand/20 bg-brand/5 px-3 py-1 text-sm font-medium text-brand mb-6">
                <span className="flex h-2 w-2 rounded-full bg-brand mr-2"></span>
                Now Available for Early Access
              </div>
              <h1 className="font-display text-5xl font-bold tracking-tight text-slate-900 sm:text-6xl mb-6">
                Turn your photos into <span className="text-brand">coloring pages</span> in seconds.
              </h1>
              <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                Upload any photo and our AI will instantly convert it into a high-quality coloring page, complete with a professional color guide and tips.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Check className="h-5 w-5 text-brand" />
                  <span>Free to try</span>
                </div>
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Check className="h-5 w-5 text-brand" />
                  <span>Instant download</span>
                </div>
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Check className="h-5 w-5 text-brand" />
                  <span>No account needed</span>
                </div>
              </div>
            </div>

            {/* Right Column: Form or Result */}
            <div className="relative mx-auto w-full max-w-md lg:max-w-full">
              {/* Decorative blob */}
              <div className="absolute -top-12 -right-12 -z-10 h-[300px] w-[300px] rounded-full bg-brand/10 blur-3xl"></div>

              {result ? (
                // SUCCESS VIEW
                <div className="relative overflow-hidden rounded-3xl bg-white p-6 shadow-2xl shadow-slate-200 ring-1 ring-slate-200 sm:p-8">
                  <div className="text-center space-y-6">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600 mb-2">
                      <Check className="h-6 w-6" />
                    </div>
                    <h2 className="font-display text-2xl font-bold text-slate-900">Your Coloring Page is Ready!</h2>

                    {/* Images Container */}
                    <div className="space-y-4">
                      <div className="overflow-hidden rounded-xl border border-slate-100 bg-slate-50 shadow-inner">
                        <img src={result.lineArtUrl} alt="Generated Line Art" className="w-full h-auto object-contain max-h-[400px]" />
                      </div>
                      <div className="flex justify-center items-center gap-2">
                        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Original Photo</span>
                        <div className="h-16 w-16 overflow-hidden rounded-lg border border-slate-200 shadow-sm">
                          <img src={result.analysis.sourceImageUrl} alt="Original Reference" className="w-full h-full object-cover" />
                        </div>
                      </div>
                    </div>

                    {/* Download Button (Visual Only) */}
                    <button className="group relative flex w-full items-center justify-center gap-2 rounded-full bg-brand px-6 py-3 text-base font-bold text-white shadow-lg shadow-brand/20 transition hover:bg-slate-900 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2">
                      <Download className="h-5 w-5" />
                      Download Coloring Page
                    </button>

                    {/* Palette */}
                    <div className="space-y-3 text-left pt-4 border-t border-slate-100">
                      <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                        <Palette className="h-4 w-4" />
                        Color Palette
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {result.analysis.palette.map((c) => (
                          <div
                            key={c.fcNo}
                            className="h-8 w-8 rounded-full border border-slate-100 shadow-sm ring-1 ring-black/5 transition hover:scale-110"
                            style={{ backgroundColor: c.hex }}
                            title={`${c.fcName} (${c.fcNo})`}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Tips */}
                    <div className="space-y-4 text-left pt-4 border-t border-slate-100">
                      <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                        <Star className="h-4 w-4" />
                        Expert Tips
                      </h3>
                      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200">
                        {result.analysis.tips.map((tip, i) => (
                          <div key={i} className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-600 shadow-sm">
                            <div className="mb-1 flex items-center gap-2">
                              <div className="h-2.5 w-2.5 rounded-full ring-1 ring-black/10" style={{ backgroundColor: tip.hex }} />
                              <span className="font-semibold text-slate-900">{tip.region}</span>
                            </div>
                            {tip.tip}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Reset */}
                    <button
                      onClick={() => setResult(null)}
                      className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-brand transition pt-2"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Create Another
                    </button>
                  </div>
                </div>
              ) : (
                // UPLOAD FORM
                <div className="relative rounded-3xl bg-white p-6 shadow-2xl shadow-slate-200 ring-1 ring-slate-200 sm:p-8">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                        Email address
                      </label>
                      <div className="mt-2">
                        <input
                          type="email"
                          id="email"
                          required
                          className="block w-full rounded-xl border-0 py-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-brand sm:text-sm sm:leading-6"
                          placeholder="you@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                        <p className="mt-2 text-xs text-slate-500">
                          We'll send your coloring page <b>PDF</b> here.
                        </p>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="photo" className="block text-sm font-medium text-slate-700">
                        Upload your photo
                      </label>
                      <div className="mt-2 flex justify-center rounded-xl border border-dashed border-slate-300 px-6 py-10 hover:bg-slate-50 transition-colors">
                        <div className="text-center">
                          {photo ? (
                            <div className="relative">
                              <img
                                src={URL.createObjectURL(photo)}
                                alt="Preview"
                                className="mx-auto h-48 object-contain rounded-lg shadow-md"
                              />
                              <button
                                type="button"
                                onClick={() => setPhoto(null)}
                                className="absolute -top-2 -right-2 rounded-full bg-white p-1 text-slate-500 shadow-sm ring-1 ring-slate-200 hover:text-red-500"
                              >
                                <X className="h-4 w-4" />
                              </button>
                              <p className="mt-2 text-sm text-slate-600">{photo.name}</p>
                            </div>
                          ) : (
                            <>
                              <div className="mx-auto h-12 w-12 text-slate-300">
                                <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </div>
                              <div className="mt-4 flex text-sm leading-6 text-slate-600 justify-center">
                                <label
                                  htmlFor="file-upload"
                                  className="relative cursor-pointer rounded-md bg-white font-semibold text-brand focus-within:outline-none focus-within:ring-2 focus-within:ring-brand focus-within:ring-offset-2 hover:text-brand/80"
                                >
                                  <span>Upload a file</span>
                                  <input
                                    id="file-upload"
                                    name="file-upload"
                                    type="file"
                                    className="sr-only"
                                    accept="image/*"
                                    onChange={(e) => {
                                      if (e.target.files && e.target.files[0]) {
                                        setPhoto(e.target.files[0]);
                                      }
                                    }}
                                  />
                                </label>
                                <p className="pl-1">or drag and drop</p>
                              </div>
                              <p className="text-xs leading-5 text-slate-500">PNG, JPG, GIF up to 10MB</p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {feedback.message && (
                      <div className={`rounded - lg p - 4 text - sm ${feedback.type === 'error' ? 'bg-red-50 text-red-700' :
                          feedback.type === 'success' ? 'bg-green-50 text-green-700' :
                            'bg-blue-50 text-blue-700'
                        } `}>
                        <div className="flex items-center gap-2">
                          {feedback.type === 'processing' && (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          )}
                          {feedback.message}
                        </div>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isLoading || !email || !photo}
                      className="w-full rounded-full bg-brand px-6 py-3 text-base font-bold text-white shadow-lg shadow-brand/20 transition hover:bg-slate-900 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? 'Processing...' : 'Turn my photo into a free page'}
                    </button>
                  </form>

                  <p className="text-center text-xs text-[var(--color-text-secondary)] mt-6 pt-4 border-t border-[var(--color-border)]">
                    Your photo stays private. You can delete it with one click.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 2. Problem / Agitation Section */}
      <section className="py-20 bg-white">
        <div className="container-section">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="font-serif-heading text-3xl sm:text-4xl font-bold mb-4 text-[var(--color-text-primary)]">Why most adult coloring books end up on a shelf</h2>
            <h3 className="text-xl text-[var(--color-text-secondary)] font-medium font-sans-body">They calm your hands. Not your heart.</h3>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Visual Placeholder */}
            <div className="bg-gray-100 aspect-video rounded-xl flex items-center justify-center text-[var(--color-text-secondary)]">
              [Image: Generic Coloring Book vs Personal PhotoLineArt]
            </div>

            <div className="space-y-6">
              <p className="text-lg text-[var(--color-text-primary)]">
                You buy a beautiful “adult coloring book,” sit down to relax… and it’s page after page of random mandalas, forests, and quotes that mean nothing to you.
              </p>
              <p className="text-lg text-[var(--color-text-primary)]">
                You color a few, feel oddly flat, and the book disappears into a drawer.
              </p>

              <ul className="space-y-3">
                <li className="flex items-start">
                  <span className="text-[var(--color-accent-clay)] mr-2">•</span>
                  You’re coloring someone else’s idea of calm, not your own memories.
                </li>
                <li className="flex items-start">
                  <span className="text-[var(--color-accent-clay)] mr-2">•</span>
                  The art feels childish or noisy instead of thoughtful and refined.
                </li>
                <li className="flex items-start">
                  <span className="text-[var(--color-accent-clay)] mr-2">•</span>
                  After a week, the book is clutter, not a ritual.
                </li>
              </ul>

              <div className="pt-4 border-l-4 border-[var(--color-cta-primary)] pl-4">
                <p className="text-lg font-medium text-[var(--color-cta-primary)] italic font-serif-heading">
                  Now picture this instead: your grandmother’s kitchen, your dog on that favorite trail, or the café from your last big trip—quietly waiting on the page, ready to be brought back to life, stroke by stroke.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Solution / Benefits Section */}
      <section id="how-it-works" className="py-20 bg-[var(--color-base)]">
        <div className="container-section">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="font-serif-heading text-3xl sm:text-4xl font-bold mb-4 text-[var(--color-text-primary)]">A coloring book made from your life</h2>
            <h3 className="text-xl text-[var(--color-text-secondary)] font-medium font-sans-body">Turn “lost in your camera roll” photos into a ritual you actually look forward to.</h3>
          </div>

          {/* Before / After / Bridge */}
          <div className="grid lg:grid-cols-3 gap-8 mb-20">
            <div className="bg-white p-8 rounded-xl shadow-sm border border-[var(--color-border)]">
              <h4 className="text-[var(--color-accent-clay)] font-bold uppercase tracking-wider text-sm mb-3 font-sans-body">Before</h4>
              <p className="text-[var(--color-text-primary)]">Your best moments are buried in phone backups and old albums. They’re important, but you rarely sit with them.</p>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-sm border border-[var(--color-border)]">
              <h4 className="text-[var(--color-cta-primary)] font-bold uppercase tracking-wider text-sm mb-3 font-sans-body">After</h4>
              <p className="text-[var(--color-text-primary)]">PhotoLineArt turns those same moments into gallery-quality line drawings with guided colors. You slow down. You remember. You create something you can hold.</p>
            </div>
            <div className="bg-[var(--color-final-cta-bg)] p-8 rounded-xl border border-[var(--color-cta-primary)]/20 flex items-center">
              <p className="text-[var(--color-cta-primary)] font-medium italic font-serif-heading">
                Upload one photo. We handle the line art, the layout, and Faber-Castell recommendations tuned to your exact image and pencil set.
              </p>
            </div>
          </div>

          {/* 3 Steps */}
          <div className="grid md:grid-cols-3 gap-12 mb-16">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-2xl font-serif-heading font-bold text-[var(--color-accent-clay)] border-4 border-[var(--color-accent-clay)] mx-auto">1</div>
              <h4 className="text-xl font-bold font-serif-heading text-[var(--color-text-primary)]">Upload a favorite photo</h4>
              <p className="text-[var(--color-text-secondary)]">Choose a clear shot of a person, pet, place, or memory you don’t want to lose to the scroll.</p>
            </div>
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-2xl font-serif-heading font-bold text-[var(--color-accent-clay)] border-4 border-[var(--color-accent-clay)] mx-auto">2</div>
              <h4 className="text-xl font-bold font-serif-heading text-[var(--color-text-primary)]">We create the art and color map</h4>
              <p className="text-[var(--color-text-secondary)]">Our AI converts your photo into detailed line art and a companion page with Faber-Castell suggestions matched to your chosen set (12, 24, 36, 60+).</p>
            </div>
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-2xl font-serif-heading font-bold text-[var(--color-accent-clay)] border-4 border-[var(--color-accent-clay)] mx-auto">3</div>
              <h4 className="text-xl font-bold font-serif-heading text-[var(--color-text-primary)]">Download, print, and start coloring</h4>
              <p className="text-[var(--color-text-secondary)]">Get a high-resolution PDF sized for standard letter/A4. Print at home or any office supply store and start coloring the same day.</p>
            </div>
          </div>

          <div className="text-center mb-16">
            <a
              href="#hero-form"
              className="btn-primary inline-block text-xl px-10 py-4"
            >
              Show me my photo as line art
            </a>
            <p className="text-sm text-[var(--color-text-secondary)] mt-3">Free trial: one full-resolution page + expert tips, no card.</p>
          </div>

          {/* Core Benefit Bullets */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 pt-12 border-t border-[var(--color-border)]">
            <div>
              <h5 className="font-bold text-[var(--color-text-primary)] mb-2 font-serif-heading">Deeply personal</h5>
              <p className="text-sm text-[var(--color-text-secondary)]">Every page starts with a real memory—family, pets, trips, tiny everyday scenes.</p>
            </div>
            <div>
              <h5 className="font-bold text-[var(--color-text-primary)] mb-2 font-serif-heading">Built for colored pencils</h5>
              <p className="text-sm text-[var(--color-text-secondary)]">Line weight, detail, and white space tuned for longer, focused sessions.</p>
            </div>
            <div>
              <h5 className="font-bold text-[var(--color-text-primary)] mb-2 font-serif-heading">Guided, not guessed</h5>
              <p className="text-sm text-[var(--color-text-secondary)]">Specific Faber-Castell pencil numbers for skin, sky, stone, foliage, and more.</p>
            </div>
            <div>
              <h5 className="font-bold text-[var(--color-text-primary)] mb-2 font-serif-heading">Gift-ready in an afternoon</h5>
              <p className="text-sm text-[var(--color-text-secondary)]">Print, bind, and wrap a book that could only come from you.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Social Proof & Trust Section */}
      <section id="examples" className="py-20 bg-white">
        <div className="container-section">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="font-serif-heading text-3xl sm:text-4xl font-bold mb-4 text-[var(--color-text-primary)]">What people are coloring with PhotoLineArt</h2>
            <h3 className="text-xl text-[var(--color-text-secondary)] font-medium font-sans-body">Real photos. Real pages. Real rituals.</h3>
          </div>

          {/* Testimonials */}
          <div className="grid lg:grid-cols-3 gap-8 mb-16">
            <div className="bg-[var(--color-base)] p-8 rounded-xl">
              <div className="flex text-[var(--color-soft-gold)] mb-4">
                {[...Array(5)].map((_, i) => <Star key={i} size={16} fill="currentColor" />)}
              </div>
              <p className="text-[var(--color-text-primary)] italic mb-6">“In one evening I turned a folder of old family photos into six pages my sister and I now color together on video calls. It feels like visiting our childhood.”</p>
              <p className="font-bold text-[var(--color-cta-primary)] font-serif-heading">— Elena K., 52, Seattle</p>
            </div>
            <div className="bg-[var(--color-base)] p-8 rounded-xl">
              <div className="flex text-[var(--color-soft-gold)] mb-4">
                {[...Array(5)].map((_, i) => <Star key={i} size={16} fill="currentColor" />)}
              </div>
              <p className="text-[var(--color-text-primary)] italic mb-6">“I made a small book from our honeymoon pictures. We color one page every Sunday. It’s our reset button.”</p>
              <p className="font-bold text-[var(--color-cta-primary)] font-serif-heading">— Marcus L., 38, Chicago</p>
            </div>
            <div className="bg-[var(--color-base)] p-8 rounded-xl">
              <div className="flex text-[var(--color-soft-gold)] mb-4">
                {[...Array(5)].map((_, i) => <Star key={i} size={16} fill="currentColor" />)}
              </div>
              <p className="text-[var(--color-text-primary)] italic mb-6">“I’m not an artist, but the Faber-Castell tips told me exactly which pencils to use. The pages look grown-up, not cutesy. It lives on my coffee table, not in a box.”</p>
              <p className="font-bold text-[var(--color-cta-primary)] font-serif-heading">— Priya S., 47, Boston</p>
            </div>
          </div>

          {/* Mini "By the Numbers" */}
          <div className="text-center mb-12 space-y-2">
            <p className="text-lg text-[var(--color-text-primary)] font-medium">Thousands of pages created from family archives, pet photos, and travel albums.</p>
            <p className="text-lg text-[var(--color-text-primary)] font-medium">9 out of 10 trial users go on to color at least one full page.</p>
          </div>

          {/* Gallery Placeholder */}
          <div className="bg-gray-100 h-64 rounded-xl flex items-center justify-center text-[var(--color-text-secondary)] mb-12">
            [Scrollable Gallery Strip: Photo → Line Art → Colored]
          </div>

          <div className="text-center">
            <a
              href="#hero-form"
              className="btn-primary inline-block text-lg px-8 py-3"
            >
              Create my free coloring page
            </a>
            <p className="text-sm text-[var(--color-text-secondary)] mt-2">Start with one photo that still makes you pause.</p>
          </div>
        </div>
      </section>

      {/* 5. Differentiation Section */}
      <section className="py-20 bg-[var(--color-base)]">
        <div className="container-section">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="font-serif-heading text-3xl sm:text-4xl font-bold mb-4 text-[var(--color-text-primary)]">Why PhotoLineArt feels different the first time you use it</h2>
            <h3 className="text-xl text-[var(--color-text-secondary)] font-medium font-sans-body">Not an app to tap through. A tool you sit down with.</h3>
          </div>

          <div className="grid md:grid-cols-2 gap-12">
            <div className="flex gap-6">
              <div className="flex-shrink-0 w-12 h-12 bg-white rounded-lg flex items-center justify-center text-[var(--color-cta-primary)] shadow-sm border border-[var(--color-border)]">
                <ScanLine size={24} />
              </div>
              <div>
                <h4 className="text-xl font-bold font-serif-heading mb-2 text-[var(--color-text-primary)]">Line art that actually looks like your photo</h4>
                <p className="text-[var(--color-text-secondary)]">Our AI is tuned for faces, textures, and depth. Wrinkles in a hand. Fur on a dog. Light in a window. You recognize the moment immediately—without harsh “cartoon filter” edges.</p>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex-shrink-0 w-12 h-12 bg-white rounded-lg flex items-center justify-center text-[var(--color-cta-primary)] shadow-sm border border-[var(--color-border)]">
                <Palette size={24} />
              </div>
              <div>
                <h4 className="text-xl font-bold font-serif-heading mb-2 text-[var(--color-text-primary)]">Faber-Castell color maps for each image</h4>
                <p className="text-[var(--color-text-secondary)]">Alongside every page, you get a guide that calls out specific Faber-Castell pencils. Choose your set size (12, 24, 36, 60+). We match colors for skin, stone, foliage, sky, and more so you’re never guessing at tones.</p>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex-shrink-0 w-12 h-12 bg-white rounded-lg flex items-center justify-center text-[var(--color-cta-primary)] shadow-sm border border-[var(--color-border)]">
                <Flower2 size={24} />
              </div>
              <div>
                <h4 className="text-xl font-bold font-serif-heading mb-2 text-[var(--color-text-primary)]">Layouts designed for mindful adults</h4>
                <p className="text-[var(--color-text-secondary)]">Pages are detailed but breathable. Thoughtful white space. Balanced line weight. Enough intricacy to keep your mind engaged without turning the page into visual noise.</p>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex-shrink-0 w-12 h-12 bg-white rounded-lg flex items-center justify-center text-[var(--color-cta-primary)] shadow-sm border border-[var(--color-border)]">
                <Printer size={24} />
              </div>
              <div>
                <h4 className="text-xl font-bold font-serif-heading mb-2 text-[var(--color-text-primary)]">Book-ready files you control</h4>
                <p className="text-[var(--color-text-secondary)]">Your free trial page arrives as a high-resolution PDF. Standard letter/A4. Print at home on heavier paper or walk into any office supply store and ask them to bind it. No shipping. No waiting.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. FAQ Section */}
      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-serif-heading text-3xl sm:text-4xl font-bold mb-4 text-[var(--color-text-primary)]">Questions before you trust us with your favorite photos</h2>
            <h3 className="text-xl text-[var(--color-text-secondary)] font-medium font-sans-body">Fair. Here are straight answers.</h3>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "Will the line art really look like my photo?",
                a: "Yes. The model is trained to preserve faces and key details, not blur them. You’ll see a preview based on your actual photo before you download."
              },
              {
                q: "Is this going to feel childish?",
                a: "No. There are no cartoon characters or clip-art backgrounds. The pages are designed for adults who like detail, subtle shading, and slower work with real pencils."
              },
              {
                q: "I’m not an artist. Is this too advanced?",
                a: "If you can color inside a line, you’re fine. Each page includes practical tips and specific pencil suggestions. Follow them exactly or just use them as a starting point."
              },
              {
                q: "What happens to my photos?",
                a: "Your images are encrypted in transit and used only to generate your art and tips. We don’t sell your data, and you can ask us to delete your photos and files at any time."
              },
              {
                q: "How do I print and bind my pages?",
                a: "Your file is ready for standard letter/A4. Print on heavier paper at home or email it to a local print/office shop and ask for simple spiral or comb binding. Most places can do it in a day."
              },
              {
                q: "What exactly do I get in the free trial?",
                a: "You get three pages built from one photo: The original photo page, the detailed line art page, and a companion tips page with Faber-Castell suggestions. No credit card. Keep the pages even if you never upgrade."
              }
            ].map((item, index) => (
              <div key={index} className="border border-[var(--color-border)] rounded-lg overflow-hidden">
                <button
                  className="w-full flex items-center justify-between p-4 text-left bg-[var(--color-base)] hover:bg-[var(--color-final-cta-bg)] transition-colors"
                  onClick={() => toggleFaq(index)}
                >
                  <span className="font-semibold text-[var(--color-text-primary)] font-serif-heading">{item.q}</span>
                  {openFaq === index ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
                {openFaq === index && (
                  <div className="p-4 bg-white text-[var(--color-text-secondary)]">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Final CTA Section */}
      <section className="py-20 bg-[var(--color-final-cta-bg)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-serif-heading text-3xl sm:text-4xl font-bold mb-6 text-[var(--color-text-primary)]">Your photos are piling up. Turn one into something you can hold.</h2>
          <p className="text-xl text-[var(--color-text-primary)] mb-8">Take one memory off the screen and onto your table tonight.</p>

          <div className="flex flex-col sm:flex-row justify-center gap-8 mb-12 text-left max-w-2xl mx-auto">
            <div className="flex items-start">
              <Check className="w-5 h-5 text-[var(--color-cta-primary)] mt-1 mr-2 flex-shrink-0" />
              <div>
                <span className="font-bold text-[var(--color-text-primary)]">Personal:</span>
                <span className="text-[var(--color-text-secondary)] ml-1">Built from your own photos, not stock images.</span>
              </div>
            </div>
            <div className="flex items-start">
              <Check className="w-5 h-5 text-[var(--color-cta-primary)] mt-1 mr-2 flex-shrink-0" />
              <div>
                <span className="font-bold text-[var(--color-text-primary)]">Thoughtful:</span>
                <span className="text-[var(--color-text-secondary)] ml-1">Designed for colored pencils, quiet time, and real focus.</span>
              </div>
            </div>
            <div className="flex items-start">
              <Check className="w-5 h-5 text-[var(--color-cta-primary)] mt-1 mr-2 flex-shrink-0" />
              <div>
                <span className="font-bold text-[var(--color-text-primary)]">Fast:</span>
                <span className="text-[var(--color-text-secondary)] ml-1">One free page in minutes, ready to print and color.</span>
              </div>
            </div>
          </div>

          <a
            href="#hero-form"
            className="btn-primary inline-block text-xl px-12 py-5"
          >
            Turn my photo into a free page
          </a>
          <p className="text-sm text-[var(--color-text-secondary)] mt-4">No card. One photo. Yours to keep and color.</p>

          <p className="text-sm text-[var(--color-text-secondary)] mt-8 italic">
            If you’re done coloring generic designs, start with a single photo that still makes you feel something.
          </p>
        </div>
      </section>

      {/* 8. Footer */}
      <footer className="bg-white border-t border-[var(--color-border)] py-12">
        <div className="container-section text-center">
          <div className="font-serif-heading text-lg font-bold tracking-wide mb-6 text-[var(--color-text-primary)]">
            Photo<span className="font-semibold italic">LineArt</span>
          </div>

          <nav className="flex flex-wrap justify-center gap-6 mb-8 text-sm font-medium text-[var(--color-cta-primary)]">
            <a href="#" className="hover:text-[var(--color-cta-hover)] transition-colors">About</a>
            <a href="#how-it-works" className="hover:text-[var(--color-cta-hover)] transition-colors">How it works</a>
            <a href="#" className="hover:text-[var(--color-cta-hover)] transition-colors">Privacy</a>
            <a href="#" className="hover:text-[var(--color-cta-hover)] transition-colors">Terms</a>
            <a href="#" className="hover:text-[var(--color-cta-hover)] transition-colors">Contact</a>
          </nav>

          <p className="text-xs text-[var(--color-text-secondary)] max-w-2xl mx-auto">
            PhotoLineArt uses AI to help create line art and color guides from your photos. We treat your images and personal data with care. See our Privacy Policy for the details.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
