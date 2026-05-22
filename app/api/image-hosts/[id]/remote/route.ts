import { NextRequest, NextResponse } from 'next/server';
import { listRemoteImages, HOSTS } from '@/lib/hosting/registry';
import type { HostingProviderId } from '@/lib/hosting/types';

/**
 * GET /api/image-hosts/{id}/remote?limit=50
 * Returns the most recent images stored remotely on this host (when supported).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!Object.keys(HOSTS).includes(id)) {
      return NextResponse.json({ error: `Unknown host: ${id}` }, { status: 400 });
    }
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);
    const images = await listRemoteImages(id as HostingProviderId, { limit });
    return NextResponse.json({ images });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'failed', images: [] },
      { status: 500 }
    );
  }
}
