import { NextRequest, NextResponse } from 'next/server';
import { setDefaultTts, TTS_PROVIDERS } from '@/lib/tts/registry';
import type { TtsProviderId } from '@/lib/tts/types';

/** PUT /api/tts/engines/default  body: { id } */
export async function PUT(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!Object.keys(TTS_PROVIDERS).includes(id)) {
      return NextResponse.json({ error: `Unknown engine: ${id}` }, { status: 400 });
    }
    await setDefaultTts(id as TtsProviderId);
    return NextResponse.json({ ok: true, defaultEngine: id });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'failed' },
      { status: 400 }
    );
  }
}
