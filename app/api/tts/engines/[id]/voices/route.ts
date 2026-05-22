import { NextRequest, NextResponse } from 'next/server';
import { listVoicesFor, TTS_PROVIDERS } from '@/lib/tts/registry';
import type { TtsProviderId } from '@/lib/tts/types';

/**
 * GET /api/tts/engines/{id}/voices
 * Live-fetches voices for the engine (uses stored key when supported).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!Object.keys(TTS_PROVIDERS).includes(id)) {
      return NextResponse.json({ error: `Unknown engine: ${id}` }, { status: 400 });
    }
    const voices = await listVoicesFor(id as TtsProviderId);
    return NextResponse.json({ voices });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'failed', voices: [] },
      { status: 500 }
    );
  }
}
