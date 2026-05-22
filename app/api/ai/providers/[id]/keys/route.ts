import { NextRequest, NextResponse } from 'next/server';
import {
  saveProviderCreds, clearProviderCreds, PROVIDERS, getProviderCreds,
} from '@/lib/ai/providers/registry';
import type { ProviderId } from '@/lib/ai/providers/types';

const VALID_IDS = new Set(Object.keys(PROVIDERS));

function assertProvider(id: string): asserts id is ProviderId {
  if (!VALID_IDS.has(id)) throw new Error(`Unknown provider: ${id}`);
}

/** PUT /api/ai/providers/{id}/keys  — save api key (and optional account) */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    assertProvider(id);
    const { apiKey = '', apiAccount } = await req.json();
    await saveProviderCreds(id, { apiKey, apiAccount });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'failed' },
      { status: 400 }
    );
  }
}

/** DELETE /api/ai/providers/{id}/keys  — clear stored creds */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    assertProvider(id);
    await clearProviderCreds(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'failed' },
      { status: 400 }
    );
  }
}

/** GET — returns masked key (just length + first/last chars) for UI display */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    assertProvider(id);
    const creds = await getProviderCreds(id);
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
