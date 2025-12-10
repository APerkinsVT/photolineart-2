import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env ${name}`);
  return value;
}

// Basic allowlist so we only redirect to https URLs
function isSafeUrl(url: string) {
  return url.startsWith('https://') || url.startsWith('http://');
}

async function lookupPdfUrl(runId?: string | null, manifestUrl?: string | null) {
  if (!runId && !manifestUrl) return null;
  try {
    const supabase = createClient(getEnv('SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'), {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await supabase
      .from('runs')
      .select('pdf_url')
      .match(
        runId ? { pla_run_id: runId } : { manifest_url: manifestUrl ?? undefined },
      )
      .order('created_at', { ascending: false })
      .limit(1);
    if (error) throw error;
    const pdfUrl = data?.[0]?.pdf_url as string | undefined;
    return pdfUrl || null;
  } catch (err) {
    console.warn('lookupPdfUrl failed', err);
    return null;
  }
}

async function logDownload(pdfUrl: string, runId: string | null, email: string | null, ua: string | undefined) {
  try {
    const supabase = createClient(getEnv('SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'), {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    await supabase.from('downloads').insert({
      run_id: runId,
      email: email,
      pdf_url: pdfUrl,
      user_agent: ua || null,
    });
  } catch (err) {
    console.warn('Download log failed:', err);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).send('Method not allowed');
    return;
  }

  const manifestUrl = (req.query.manifest_url as string) || '';
  const runId = (req.query.run_id as string) || null;
  const email = (req.query.email as string) || null;

  const pdfUrlFromQuery = (req.query.url as string) || '';
  const pdfUrl = pdfUrlFromQuery || (await lookupPdfUrl(runId, manifestUrl));

  if (!pdfUrl || !isSafeUrl(pdfUrl)) {
    res.status(404).send('Not found');
    return;
  }

  await logDownload(pdfUrl, runId, email, req.headers['user-agent']);

  // Attempt to stream the PDF with an attachment header so the browser shows a save dialog.
  try {
    const upstream = await fetch(pdfUrl);
    if (!upstream.ok) {
      throw new Error(`Upstream fetch failed: ${upstream.status}`);
    }
    const arrayBuffer = await upstream.arrayBuffer();
    const contentType = upstream.headers.get('content-type') || 'application/pdf';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', 'attachment; filename="photolineart-book.pdf"');
    res.status(200).send(Buffer.from(arrayBuffer));
    return;
  } catch (err) {
    console.warn('Download proxy failed, falling back to redirect:', err);
  }

  // Fallback to redirect if streaming fails.
  res.setHeader('Location', pdfUrl);
  res.status(302).end();
}
