# PhotoLineArt – Supplemental Handoff & Current Status (New Dev Session) 2025-12-26

## 1) What PhotoLineArt does
PhotoLineArt is a web app that converts user photos into printable line-art coloring pages and gift-ready multi-page books. Users typically upload emotionally meaningful photos (families, couples, pets, meaningful places). The app:
- Generates line art via Replicate.
- Builds a printable PDF containing the line-art page, Faber-Castell Polychromos palette swatches, short coloring tips, and the original photo as a reference.
- Sends the PDF via email and/or provides a download link.

The current live site is photolineart.com (Vercel). The single free page flow works end-to-end; the paid multi-photo book flow also works with Stripe and is accessible in the Studio page.

## 2) Tech stack & key pieces
- Frontend: React + TypeScript + Vite (React Router). Custom CSS in `photolineart.css` (not Tailwind in practice).
- Backend: Vercel serverless API routes in `api/`.
- AI: Replicate model `google/nano-banana` for line art; OpenAI for tip enrichment and palette/tip semantics.
- Storage: Vercel Blob for photos, line art, manifests, and PDFs (when retention is enabled).
- Logging: Supabase tables for `email_captures`, `runs`, `downloads` (book runs include `pla_run_id`).

Key files:
- `src/routes/LandingPage.tsx` – free single-page flow + hybrid upgrade modal.
- `src/routes/StudioPage.tsx` – paid multi-photo flow (Stripe gate).
- `src/state/useBatchUploader.ts` – upload/processing pipeline.
- `api/ai-lineart.ts`, `api/tips-enhance.ts`, `api/send-pdf.ts`, `api/upload-pdf.ts`, `api/create-checkout-session.ts`.
- `src/print/pdfBuilder.ts` – PDF generation (single + book).

## 3) Current product behavior (real usage)
Users are uploading emotional/meaningful photos: family, couples, pets, and special places. Many return for additional free pages. This validates the free single-page offering; we are now moving into monetization and segmentation.

## 4) Business model & UX direction (current target)
We are evolving toward a product ladder:
1) On-ramp: 1 free page per email (always).
2) Core paid self-use: 3-page pack for $5 (credit system; credits tied to email in Supabase).
3) Larger packs later (6 for $9, 12 for $15, etc.) using the same credit infrastructure.
4) Gift/keepsake product: 6-page book for $19 (current paid flow), separate multi-photo flow.

Key principle: All generation flows (free single page, credits, gift book) should pass through a single backend “gate” that decides whether this email gets a free page, uses credits, or must be upsold.

## 5) Landing page segmentation direction
We will add a “Who uses PhotoLineArt?” section to the Landing page with anchored cards for:
- Families / kids / grandparents
- Couples / anniversaries / weddings
- Pets as family
- Special places

Each card has a heading, 1–2 example images, 2–3 lines of copy, and a CTA to the Studio page (optional `?seg=`). Ads will deep-link to anchors like `/#families`, so hash-based scrolling must work.

## 6) What’s already working vs. needs to change
Already working (do not break):
- Single-page flow: upload → line art → PDF → download link + email.
- Faber-Castell palette rendering in UI and PDF.
- Hybrid upsell modal on Landing.
- Paid multi-photo flow with Stripe for 6-photo book ($19), with retention option.

Needs to be added / refactored:
- Credits system: per-email free-use flag + paid credits.
- Centralized backend gate in the generate API route.
- Stripe purchase for 3-page pack ($5).
- Landing page “Who uses PhotoLineArt?” section with anchors and segment CTAs.
- Ensure returning users always go through the gate; prevent unlimited free pages per email.

## 7) Current dependencies and environment
- Vercel dev: `npx vercel dev --listen 3001`
- Vite dev: `npm run dev` (5173)
- Required env vars:
  - `PUBLIC_BASE_URL`
  - `REPLICATE_API_TOKEN`, `REPLICATE_MODEL`, `REPLICATE_VERSION`
  - `BLOB_READ_WRITE_TOKEN`
  - `OPENAI_API_KEY`
  - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
  - Stripe envs (test/live): `STRIPE_SECRET_TEST_KEY`, `STRIPE_SECRET_LIVE_KEY`, `STRIPE_PRICE_ID_6_BOOK_TEST`, `STRIPE_PRICE_ID_6_BOOK_LIVE`

## 8) Next phase (implementation roadmap)
1) Backend credit gate (Supabase-backed): free-page usage + credits.
2) Frontend integration: flow decisions and UI states based on gate response.
3) Landing page segmentation section with anchor cards.

## 9) Open questions / clarifications (current)
- Do we keep the current 6-for-$19 book flow unchanged while adding 3-for-$5 credits, or should the book flow be updated to mention credits?
- Should the credit purchase (3-for-$5) be part of the Landing page modal, Studio page, or both?
- Do we want to store credit purchase history in Supabase (table + receipts), or only store `credits_remaining`?
- Should the free page limit be per email only, or also per device/IP?
- Do we need any migration or data backfill for existing emails in `email_captures`?
