You are the principal engineer for a fresh build of **photolineart-2**.

Objective (PLAN ONLY, NO CODE):
Design a stable, low-surprise plan for a multi-photo app: user uploads photos → AI (Replicate: google/nano-banana) generates high-fidelity line art + color suggestions → client makes 2-page PDFs → publish a bundle + portal page. Keep contracts explicit and dev ergonomics simple.

Non-negotiables
• Frontend: Vite + React + TypeScript + Tailwind (minimal styling ok).
• Backend: Vercel Functions (Node), Vercel Blob for storage.
• Model: Replicate “google/nano-banana”.
• Color basis: Faber-Castell Polychromos JSON (we’ll provide).
• Multi-photo from day one (queue with per-item status).
• PDF (client, jsPDF): 2 pages/photo:
  Pg1: line art; Pg2: small reference image, 3–5 generic tips, a per-image suggestions table (swatch | FC pencil name+number | suggestion), QR + portal URL.
• Publishing: create a bundle (manifest.json + assets) copied into Blob; portal at `/p/:id`.
• Use Blob URLs across the network to avoid tainted canvases (no data URLs over API).

Dev protocol (lock this)
• Terminal A: `npx vercel dev --listen 3001` (functions on :3000 in dev).
• Terminal B: `npx vite --port 5173 --clearScreen false` (UI on :5173).
• ENV:
  - Local/Dev/Preview: `PUBLIC_BASE_URL=http://localhost:5173`
  - Production: `PUBLIC_BASE_URL=https://photolineart.com`
  - `REPLICATE_API_TOKEN`, `REPLICATE_MODEL=google/nano-banana`, `REPLICATE_VERSION` (to be locked)
  - (If needed) `BLOB_READ_WRITE_TOKEN`
• Contracts must not change mid-build. If you must change one, version the route (`/api/v1/...`).

Deliverables for THIS RESPONSE (text plan only)
1) System Diagram (text): components + end-to-end data flow for single photo and batch:
   Choose Photos → client uploads each to Blob (signed PUT) → Replicate call → copy outputs to Blob → color match → build PDFs → create bundle → portal.
2) Directory Layout (concise tree):
   Root, `api/`, `src/` (components, pages, services, print, utils), `public/palettes/` for FC JSON.
3) API Surface & JSON Contracts (exact shapes; no code):
   • `POST /api/blob-upload` → body `{contentType}` → `{uploadUrl}`
   • `POST /api/ai-lineart` → body `{ imageUrl, options? }` → `{ lineArtUrl, analysis }`
   • `POST /api/bundles-create` → body `{ items:[{originalUrl,lineArtUrl,palette,tips}], title?, copyAssets:true }` → `{ id, portalUrl, manifestUrl, qrPngUrl }`
   • `GET /api/bundles-get?id=...` → returns manifest (specify full schema).
   Include required/optional, types, and validation rules.
4) Model I/O spec (Replicate):
   Inputs: `imageUrl`, prompt template, parameters (size/style).
   Outputs: `lineArtUrl` + **structured tips JSON**:
   `[{ region, fcNo, fcName, hex, tip }]`.
   If the model can’t emit FC numbers, define a post-process color matcher (Lab/ΔE) to nearest FC pencil; outline the algorithm and where it runs.
5) Batch Processing UX + State Machine:
   Item states: `idle → uploading → uploaded → processing → ready | error`.
   Per-item progress display, retry/backoff, cancel.
6) PDF Composition Plan (jsPDF):
   • Resource loading with CORS-safe images (Blob URLs, `crossOrigin=anonymous`).
   • Pg1: line art (set stroke gray ~60% opacity).
   • Pg2 Portrait: centered reference image; below it 3–5 generic tips; full-width table (columns: swatch 8–10mm | FC pencil 28–36mm | suggestion flexible); QR + portal URL bottom-right.
   • Pg2 Landscape: image left, generic tips right; table full-width below.
   • Overflow/pagination rules, margins, fonts in mm/pt.
7) Manifest Schema (for bundle + portal):


{
id: string,
createdAt: ISO8601,
title: string,
items: [{
originalUrl: string,
lineArtUrl: string,
palette: [{ fcNo:string, fcName:string, hex:string }],
tips: [{ region:string, fcNo?:string, fcName?:string, hex?:string, tip:string }]
}],
portalUrl: string,
model: { name:string, version:string }
}

8) Security & Reliability:
Signed uploads; server copies Replicate outputs into Blob; accepted MIME/size limits; timeouts/retries/backoff for Replicate/Blob; input validation; rate limits.
9) Testing Plan:
Local runbook (5–7 bullets), mock/stub of Replicate response, fixture image set, and a publish smoke test (manifest + portal).
10) Milestones & Order of Work (each ends with a demo):
M0 bootstrap skeleton (no model) → M1 upload + preview + batch states →
M2 Replicate integration (single) → M3 batch queue →
M4 color matching →
M5 PDF (portrait) → M6 PDF (landscape) →
M7 publish/portal/QR →
M8 polish & error UX →
M9 deploy (Dev/Preview/Prod) + smoke tests.
11) Risks & Decisions with mitigations:
Blob vs data URLs; Replicate URL expiry (always copy to Blob); tainted canvas; large images (client downscale policy); API schema freeze.
12) Acceptance Criteria:
Bullet the verifiable behaviors for M1–M3.

Constraints & Style:
• Do NOT write code.
• Use tight, actionable bullets with exact JSON shapes.
• Ask up to 5 clarifying questions only if crucial; otherwise proceed.
• Keep ports/ENV/API shapes consistent with the above throughout.
