const STEPS = [
  {
    title: 'Upload photos',
    description: 'Drag in up to a dozen favorites—family portraits, pets, vacations, anything.',
    icon: '📸',
  },
  {
    title: 'AI line art + tips',
    description: 'We convert each photo into crisp line art and craft pencil palettes + guidance.',
    icon: '🧠',
  },
  {
    title: 'Download & share',
    description: 'Publish a QR portal and full PDF coloring book with one click.',
    icon: '📘',
  },
];

export function HowItWorksSection() {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white px-6 py-10 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand/70">How it works</p>
      <h2 className="mt-2 text-2xl font-semibold text-slate-900">
        Three steps to a custom coloring book
      </h2>
      <div className="mt-6 grid gap-6 md:grid-cols-3">
        {STEPS.map((step) => (
          <article
            key={step.title}
            className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5 text-sm text-slate-600"
          >
            <span className="text-3xl" aria-hidden>
              {step.icon}
            </span>
            <h3 className="mt-3 text-lg font-semibold text-slate-900">{step.title}</h3>
            <p className="mt-2 text-slate-600">{step.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
