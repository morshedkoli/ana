import { NextRequest, NextResponse } from 'next/server';
import {
  saveHostCreds, clearHostCreds, getHostCreds, HOSTS,
} from '@/lib/hosting/registry';
import type { HostingProviderId } from '@/lib/hosting/types';

const VALID_IDS = new Set(Object.keys(HOSTS));

function assertHost(id: string): asserts id is HostingProviderId {
  if (!VALID_IDS.has(id)) throw new Error(`Unknown host: ${id}`);
}

/** GET — masked key info for the UI */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    assertHost(id);
    const creds = await getHostCreds(id);
    const mask = (v?: string) => {
      if (!v) return '';
      if (v.length <= 8) return '•'.repeat(v.length);
      return `${v.slice(0, 4)}${'•'.repeat(v.length - 8)}${v.slice(-4)}`;
    };
    return NextResponse.json({
      apiKey: mask(creds.apiKey),
      apiAccount: creds.apiAccount || '',
      hasKey: Boolean(creds.apiKey),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'failed' },
      { status: 400 }
    );
  }
}

/** PUT — save key (and optional account) */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    assertHost(id);
    const { apiKey = '', apiAccount } = await req.json();
    await saveHostCreds(id, { apiKey, apiAccount });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'failed' },
      { status: 400 }
    );
  }
}

/** DELETE — clear stored credentials */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    assertHost(id);
    await clearHostCreds(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'failed' },
      { status: 400 }
    );
  }
}
