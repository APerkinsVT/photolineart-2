import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <section className="space-y-4 text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-brand">Not found</p>
      <h1 className="font-display text-4xl font-semibold text-slate-900">This page is missing</h1>
      <p className="mx-auto max-w-xl text-base text-slate-600">
        The route you requested does not exist yet. Use the button below to return to the upload
        experience.
      </p>
      <div>
        <Link
          to="/"
          className="inline-flex rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white"
        >
          Back to uploads
        </Link>
      </div>
    </section>
  );
}
