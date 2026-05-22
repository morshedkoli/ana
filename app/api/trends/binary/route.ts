import { NextResponse } from 'next/server';
import { getYtDlpStatus, resolveYtDlp, reinstallYtDlp } from '@/lib/video/yt-dlp-binary';

/**
 * GET /api/trends/binary
 * Reports whether yt-dlp is available on this server. Does not auto-download.
 */
export async function GET() {
  const status = await getYtDlpStatus();
  return NextResponse.json(status);
}

/**
 * POST /api/trends/binary
 * Body: { reinstall?: boolean }
 * Triggers a download (or re-download) of the standalone yt-dlp binary.
 * Used by the "Install yt-dlp" button in the trends UI.
 */
export async function POST(req: Request) {
  try {
    let reinstall = false;
    try {
      const body = await req.json();
      reinstall = Boolean(body?.reinstall);
    } catch { /* empty body OK */ }

    if (reinstall) {
      await reinstallYtDlp();
    } else {
      await resolveYtDlp();
    }
    const status = await getYtDlpStatus();
    return NextResponse.json({ ok: true, ...status });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Failed' },
      { status: 500 }
    );
  }
}
