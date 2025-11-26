interface HeroSectionProps {
  onGetStarted?: () => void;
}

export function HeroSection({ onGetStarted }: HeroSectionProps) {
  return (
    <section className="flex flex-col items-center gap-8 rounded-3xl bg-gradient-to-b from-white via-slate-50 to-slate-100 px-6 py-14 text-center shadow-xl shadow-slate-200">
      <p className="text-sm font-semibold uppercase tracking-[0.35em] text-brand/70">PhotoLineArt</p>
      <div className="space-y-4">
        <h1 className="font-display text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
          Transform your photos into gift-worthy coloring books
        </h1>
        <p className="mx-auto max-w-2xl text-base text-slate-600 sm:text-lg">
          Upload a handful of favorite shots and we handle the rest—line art, pro-level pencil tips,
          QR portal, and a printable PDF book you can share instantly.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          className="rounded-full bg-brand px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-brand/30 transition hover:bg-slate-900"
          onClick={onGetStarted}
        >
          Start creating
        </button>
        <span className="text-xs uppercase tracking-wide text-slate-500">
          No design skills required · Works in your browser
        </span>
      </div>
    </section>
  );
}
