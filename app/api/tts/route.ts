import { NextRequest, NextResponse } from 'next/server';
import { generateTts } from '@/lib/tts/edge-tts';
import { connectDB, audioClips, characters } from '@/lib/db/client';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, voice, rate, pitch, save = false } = body;

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: 'Text required' }, { status: 400 });
    }

    const result = await generateTts({ text, voice, rate, pitch });

    if (save) {
      await connectDB();
      const active = await characters.findOne({ isActive: true });
      await audioClips.create({
        characterId: active?.id ?? null,
        filePath: result.filePath,
        transcript: text,
        voiceEngine: 'edge-tts',
        voiceId: voice,
        rate, pitch,
        durationSec: result.durationSec,
      });
    }

    return NextResponse.json({
      publicPath: result.publicPath,
      fileName: result.fileName,
      durationSec: result.durationSec,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('TTS error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
