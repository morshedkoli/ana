import { NextRequest, NextResponse } from 'next/server';
import { setDefaultHost, HOSTS } from '@/lib/hosting/registry';
import type { HostingProviderId } from '@/lib/hosting/types';

/** PUT /api/image-hosts/default  body: { id: HostingProviderId } */
export async function PUT(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!Object.keys(HOSTS).includes(id)) {
      return NextResponse.json({ error: `Unknown host: ${id}` }, { status: 400 });
    }
    await setDefaultHost(id as HostingProviderId);
    return NextResponse.json({ ok: true, defaultHost: id });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'failed' },
      { status: 400 }
    );
  }
}
