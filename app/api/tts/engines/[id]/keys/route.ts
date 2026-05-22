import { NextRequest, NextResponse } from 'next/server';
import {
  saveTtsKey, clearTtsKey, getTtsKey, TTS_PROVIDERS,
} from '@/lib/tts/registry';
import type { TtsProviderId } from '@/lib/tts/types';

const VALID_IDS = new Set(Object.keys(TTS_PROVIDERS));

function assertEngine(id: string): asserts id is TtsProviderId {
  if (!VALID_IDS.has(id)) throw new Error(`Unknown engine: ${id}`);
}

/** GET /api/tts/engines/{id}/keys — masked key for UI */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    assertEngine(id);
    const key = await getTtsKey(id);
    const mask = (v?: string) => {
      if (!v) return '';
      if (v.length <= 8) return '•'.repeat(v.length);
      return `${v.slice(0, 4)}${'•'.repeat(v.length - 8)}${v.slice(-4)}`;
    };
    return NextResponse.json({ apiKey: mask(key), hasKey: Boolean(key) });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'failed' },
      { status: 400 }
    );
  }
}

/** PUT /api/tts/engines/{id}/keys */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    assertEngine(id);
    const { apiKey = '' } = await req.json();
    await saveTtsKey(id, apiKey);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'failed' },
      { status: 400 }
    );
  }
}

/** DELETE /api/tts/engines/{id}/keys */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    assertEngine(id);
    await clearTtsKey(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'failed' },
      { status: 400 }
    );
  }
}
