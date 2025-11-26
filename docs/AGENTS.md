# AGENTS GUIDE

## Project Overview
PhotoLineArt turns user photos into printable coloring pages and full coloring books. Each photo is normalized (orientation, quality), processed through Replicate for line art, analyzed for color palettes, and enriched with OpenAI-generated, image-specific coloring tips tied to the Faber-Castell pencil line. The app lets users upload batches, preview results, publish bundles to a portal, and download either individual PDFs or complete booklets that include covers, a dedication/contents spread, pro tips, per-image reference + tips pages, line art pages, and a portal summary with QR code. Primary users are adults creating gift-quality coloring books.

### App Flow
1. **Upload**: Client queues photos via `useBatchUploader`; `/api/blob-upload` issues signed URLs; originals stored in Vercel Blob.
2. **Normalization**: `/api/ai-lineart` runs Sharp orientation fix, saves upright original, and calls Replicate (`google/nano-banana`) for line art.
3. **Analysis**: Color palettes derived from the image feed into per-photo manifests; `/api/tips-enhance` calls OpenAI to expand tips with multiple colors.
4. **Manifest & Portal**: `/api/bundles-create` copies assets into bundle folders and writes portal manifests; `/api/portal-update` syncs download metadata + QR.
5. **Output**: Users download single-page PDFs (`buildPdfForItem`) or bundle books (`buildBundleBook`), both rendered via jsPDF and the manifest data.

## Tech Stack
- **Frontend**: React 19 + React Router, Vite, TypeScript, Tailwind-ish utility classes plus custom CSS in `src/index.css`.
- **State / Logic**: Custom hooks (`useBatchUploader`) orchestrate uploads, retries, manifest updates.
- **Serverless APIs**: Vercel functions under `api/` (ESM TypeScript) handle Blob, Replicate, OpenAI, manifest building, and PDF-ready data.
- **PDF Generation**: jsPDF in `src/print/` renders both single-item PDFs and full books; assets fetched as data URLs.
- **AI Services**: Replicate for line art, OpenAI for semantic tip enhancement, color data matched via palette JSON in `public/palettes`.
- **Storage**: Vercel Blob for originals, line art, manifest assets; portal data lives as JSON + QR PNGs in Blob.

## Key Directories and Files
- `api/` – Vercel serverless handlers:
  - `ai-lineart.ts` (orientation fix, Replicate call, palette/tip seed)
  - `tips-enhance.ts` and `lib/*` (OpenAI enrichment, palette helpers)
  - `bundles-create.ts`, `portal-update.ts`, `portal-get.ts`, `bundles-get.ts`
  - `blob-upload.ts` for signed uploads
- `src/routes/` – `UploadPage`, `PortalPage`, `NotFoundPage`
- `src/state/useBatchUploader.ts` – core client state machine (queue, retries, publish, enhancement)
- `src/components/` – Dropzone, status cards, layout pieces
- `src/print/` – `pdfBuilder.ts`, `pdfConstants.ts`, `pdfGenericTips.ts`, `pdfUtils.ts`
- `public/palettes/` – FC palette definitions with set membership flags
- `downloads/` – local test output when books are downloaded
- `docs/` – planning/brainstorm notes

## How to Run the Project
```bash
npm install
npx vercel dev --listen 3001   # API + serverless endpoints
npm run dev                    # Vite dev server at http://localhost:5173
```
For production builds:
```bash
npm run build                  # Type-check + Vite build
```
Environment: create `.env.local` with `PUBLIC_BASE_URL`, `REPLICATE_API_TOKEN`, `REPLICATE_MODEL`, `REPLICATE_VERSION`, `BLOB_READ_WRITE_TOKEN`, `OPENAI_API_KEY`, and anything else referenced in API handlers.

## Coding Conventions and Style
- TypeScript everywhere (frontend + API). Favor explicit typings for API payloads and manifest shapes.
- React components use functional components + hooks; CSS via utility classes and `src/index.css`.
- Serverless handlers are async functions exporting `default` or named `handler`s returning JSON responses.
- PDFs rely on mm units; page constants in `pdfConstants.ts`. Keep text colors/fonts consistent (currently jsPDF Times/Helvetica with color `#0f171f`).
- Logging: use `console.log/warn/error` judiciously inside API routes for traceability.

## How AI Agents Should Work in This Repo
- Prefer small, focused changes over sweeping refactors.
- When refactoring or touching multiple parts, explain the plan briefly before editing.
- Use `apply_patch` to show full-context modifications; for large structural updates, consider presenting whole files.
- Suggest explicit commands (e.g., `npm run dev`, `npm run build`, `npx vercel dev --listen 3001`) when the user needs to run or test something.
- Keep naming descriptive and aligned with existing patterns (e.g., `PortalManifest`, `buildBundleBook`).
- Do not introduce new dependencies without a short justification and confirmation.
- Document non-obvious logic with concise comments, but avoid noise.
- Surface external failures (Replicate/OpenAI) clearly and add guards/retries rather than hiding errors.

## Common Tasks and Workflows
- **Running the pipeline**: Start Vercel dev on port 3001, Vite on 5173, upload photos, wait for “Ready,” click Publish to trigger bundle creation + tip enhancement, then download PDFs from the portal.
- **Adjusting tip logic**: Update prompts or parsing in `api/lib/openAiTips.ts` and `api/lib/tipEnhancer.ts`, ensure `tips-enhance.ts` returns enriched colors, and mirror schema changes in client types under `src/types`.
- **PDF layout tweaks**: Modify `src/print/pdfBuilder.ts` and related constants; run a local publish and download to verify layout.
- **Palette/FC data updates**: Edit JSON files in `public/palettes/`; ensure any new fields are consumed in `tipColors` utilities.

## Testing / Quality Checks
- Run `npm run build` before handing off to catch TypeScript or bundler issues.
- Manual verification: upload a small batch, ensure uploads transition through states, publish without errors, and download both single PDF and full book.
- Check browser console + Terminal A (Vercel dev) for API errors, especially when integrating external services.

This repo is actively evolving; keep the plumbing robust before layering new UX polish. Document any new flows or dependencies in AGENTS.md and ARCHITECTURE.md for future assistants.***
