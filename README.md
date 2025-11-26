# PhotoLineArt 2

Vite + React + TypeScript + Tailwind UI for the next build of photolineart.com. The current focus is Milestones M0 (project skeleton) and M1 (multi-photo upload pipeline). AI, PDF, and portal features will land in later milestones.

## Development

```
npm install
npx vercel dev --listen 3001   # Functions + API routes
npm run dev                    # Vite (http://localhost:5173)
```

Required environment variables (see `.env.local`):

- `PUBLIC_BASE_URL` – `http://localhost:5173` for local dev
- `REPLICATE_API_TOKEN` – placeholder for M2+
- `REPLICATE_MODEL`, `REPLICATE_VERSION` – to be locked later
- `BLOB_READ_WRITE_TOKEN` – Vercel Blob store token (needed now for uploads)

## Directory Highlights

- `api/` – Vercel Functions (`blob-upload` for signed client tokens)
- `src/routes` – `UploadPage`, `PortalPage`, `NotFoundPage`
- `src/state/useBatchUploader.ts` – client-side state machine for uploads
- `src/components` – layout, dropzone, batch UI, progress cards
- `src/services/blobService.ts` – typed client for `/api/blob-upload` + Blob uploads
- `public/palettes/` – Faber-Castell JSON (used in later milestones)

## Milestone Coverage

- **M0** – Baseline Vite + Tailwind scaffolding, routing, layout shell ✔️
- **M1** – Multi-photo upload UI + Vercel Blob integration, per-item states ✔️

Subsequent milestones (Replicate, queue, PDF, bundles/portal) build on this foundation without changing the API contracts already established here.
