# ARCHITECTURE

## High-Level Overview
PhotoLineArt is a Vite/React + Vercel Functions application that converts user photos into gift-quality coloring pages and books aimed at adult artists. Each uploaded photo is normalized, converted into line art via Replicate, analyzed for color palettes, and paired with OpenAI-generated, professional-sounding coloring advice keyed to the Faber-Castell pencil family. Users can download single-page PDFs or publish multi-photo bundles that produce a portal, QR code, and a full coloring book (covers, dedication, contents, pro tips, per-image reference/tip spreads, and matching line art pages).

## Main User Flows
- **Batch upload → line art**: Drag/drop on `UploadPage`, queue handled by `useBatchUploader`, originals stored in Vercel Blob, `/api/ai-lineart` normalizes orientation, requests Replicate, and returns line art + initial palette/tips.
- **Tip enhancement**: When the batch reaches Ready and the user clicks Publish, `/api/tips-enhance` enriches each tip with multiple colors pulled from OpenAI; results saved into each manifest item.
- **Bundle creation + portal**: `/api/bundles-create` copies photo assets into a bundle folder, compiles the manifest, and `/api/portal-update` writes the portal metadata + QR PNG so the `PortalPage` can render downloads.
- **PDF generation**: Users download individual PDFs through `buildPdfForItem()` or full books via `buildBundleBook()`; jsPDF consumes the manifest so reference images, tips, line art, and pro tips stay in sync.

## Frontend Architecture
- **Routing**: `src/routes/UploadPage.tsx` (entry flow) and `src/routes/PortalPage.tsx` (bundle viewer). React Router handles `/` and `/p/:id`.
- **State Management**: `src/state/useBatchUploader.ts` orchestrates the queue. Responsibilities include image preparation, signed uploads, status polling, retries (`runWithRetry`), error banners, publish actions that call `/api/tips-enhance`, `/api/bundles-create`, and `portal-update`.
- **Components**: Dropzone + batch cards live under `src/components/`. Cards reflect `PhotoItem.state` (“uploading”, “processing”, “ready”, etc.) and expose Retry/Remove actions. Portal components display reference thumbnails, line art previews, a manifest-driven download button, and QR.
- **Printing UI**: While downloads are jsPDF-based, there are also single-photo previews inside the portal, sharing layout styles from `src/index.css` and `src/routes`.

## Backend / API Architecture
- All server functionality sits under `api/` and is deployed as Vercel Edge/Node functions via `npx vercel dev`.
- **`api/blob-upload.ts`** – issues signed PUT URLs plus public read tokens so the browser can upload directly to Vercel Blob.
- **`api/ai-lineart.ts`** – receives the uploaded asset reference, normalizes orientation via Sharp, stores the corrected original, calls Replicate (`google/nano-banana`) to create line art, seeds palette/tip stubs, and returns `LineArtResponse`.
- **`api/tips-enhance.ts`** – reads the manifest items, calls OpenAI (Vision-enabled model) to extract semantic regions and recommended pencils, and persists enriched tips (with `colors[]`) plus set-size context using helpers in `api/lib/tipEnhancer.ts` and `api/lib/openAiTips.ts`.
- **`api/bundles-create.ts`** – copies originals and line art from user folders into `bundles/{bundleId}/...`, builds a manifest array with palette/tips, stores it in Blob, and returns bundle metadata.
- **`api/portal-update.ts` / `portal-get.ts` / `bundles-get.ts`** – manage portal manifests, QR code PNGs, and portal detail retrieval.
- **`api/lib/*`** – shared helpers for palette math, image normalization, manifest typing, and OpenAI prompt construction.

## Data Flow and JSON Schemas
1. **Client PhotoItem** (`src/types/photo.ts`): tracks upload state, file metadata, blob URLs, analysis, and progress.
2. **LineArtAnalysis** (`src/types/ai.ts`): produced by `/api/ai-lineart`, includes palette, initial tips, and model info.
3. **Portal Manifest** (`src/types/manifest.ts`): written by `/api/bundles-create` and enriched by `/api/tips-enhance`.

Example manifest item:
```json
{
  "title": "Aloha Orchid",
  "originalUrl": "https://.../bundles/{id}/originals/0.jpg",
  "lineArtUrl": "https://.../bundles/{id}/line-art/0.jpg",
  "palette": [
    { "fcNo": "219", "fcName": "Deep Scarlet Red", "hex": "#E8495E" },
    { "fcNo": "132", "fcName": "Light Flesh", "hex": "#FBC29F" }
  ],
  "tips": [
    {
      "region": "Petals",
      "fcNo": "219",
      "fcName": "Deep Scarlet Red",
      "hex": "#E8495E",
      "tip": "Layer Deep Scarlet Red with Dark Red in the folds...",
      "colors": [
        { "fcNo": "219", "fcName": "Deep Scarlet Red", "hex": "#E8495E" },
        { "fcNo": "225", "fcName": "Dark Red", "hex": "#7B1F27" },
        { "fcNo": "101", "fcName": "White", "hex": "#FFFFFF" }
      ]
    }
  ],
  "setSize": 72
}
```
The frontend consumes this schema to display portal rows, color swatches, and PDF content.

## Integration Points
- **Vercel Blob** – storage for originals, line art, manifests, QR PNGs, and downloads.
- **Replicate (`google/nano-banana`)** – generates line art images from normalized photos.
- **OpenAI** – semantic tip enhancement + per-tip color extraction.
- **Sharp** – image orientation + normalization before sending to Replicate.
- **jsPDF** – client-side PDF rendering for both individual pages (`buildPdfForItem`) and full books (`buildBundleBook`).
- **Google Fonts assets** – Lora + DM Sans loaded for the web UI; PDFs currently rely on built-in fonts for reliability.

## Current Limitations / Known Issues
- External AI services can be slow or return 5xx (Replicate Cloudflare issues); current retries are limited, so user intervention is sometimes required.
- No automated tests cover the pipeline; regressions are caught manually.
- The PDF builder assumes synchronous image fetches and may fail if Blob URLs expire mid-build.
- Tip enhancement currently runs during publish; there is no queue or background job if the browser closes mid-call.
- Font handling uses jsPDF defaults; embedding custom fonts increases bundle size and needs careful cmap setup (previous attempts triggered Unicode errors).

## Roadmap / Next Steps
- Harden external service retries (exponential backoff, clearer messaging, optional queuing).
- Finalize cover design workflow and allow custom titles/dedications from the UI.
- Improve palette/tip alignment by sourcing all swatches directly from enhanced tips and ensuring the PDF layout never overflows.
- Add automated sanity tests (e.g., script that runs a mock manifest through `buildBundleBook`).
- Polish portal/book branding once plumbing is stable (colors, typography, marketing copy).
