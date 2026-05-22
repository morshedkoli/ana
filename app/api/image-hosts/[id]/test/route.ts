import { NextRequest, NextResponse } from 'next/server';
import { uploadToHost, HOSTS } from '@/lib/hosting/registry';
import type { HostingProviderId } from '@/lib/hosting/types';

/**
 * POST /api/image-hosts/{id}/test
 * Uploads a tiny 1x1 PNG to the host using saved credentials and returns the
 * hosted URL. Used by the "Test" button in the configure modal.
 */
const ONE_BY_ONE_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFhAJ/wlseKgAAAABJRU5ErkJggg==',
  'base64'
);

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!Object.keys(HOSTS).includes(id)) {
      return NextResponse.json({ error: `Unknown host: ${id}` }, { status: 400 });
    }
    const result = await uploadToHost(id as HostingProviderId, {
      buffer: ONE_BY_ONE_PNG,
      filename: `test-${Date.now()}.png`,
      contentType: 'image/png',
    });
    return NextResponse.json({ ok: true, url: result.url, remoteId: result.remoteId });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'failed' },
      { status: 500 }
    );
  }
}
