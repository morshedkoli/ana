import { NextRequest, NextResponse } from 'next/server';
import { connectDB, audioClips, characters } from '@/lib/db/client';
import {
  synthesizeWith, getDefaultTts, TTS_PROVIDERS,
} from '@/lib/tts/registry';
import type { TtsProviderId } from '@/lib/tts/types';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const AUDIO_DIR = path.join(process.cwd(), 'storage', 'audio');

function ensureDir() {
  if (!fs.existsSync(AUDIO_DIR)) fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

/**
 * POST /api/tts
 * Body: { text, engine?, voice?, rate?, pitch?, save?, language? }
 *
 * `engine` is the TTS provider id. If omitted, uses the user's saved default
 * (defaults to "edge"). The chosen engine handles `voice`, `rate`, `pitch`
 * however it can; engines that don't support a parameter ignore it gracefully.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, voice, rate, pitch, save = false, language } = body;
    let engine: TtsProviderId = body.engine;

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: 'Text required' }, { status: 400 });
    }
    if (!engine || !Object.keys(TTS_PROVIDERS).includes(engine)) {
      engine = await getDefaultTts();
    }

    const result = await synthesizeWith(engine, {
      text,
      voice: voice || '',
      rate: typeof rate === 'number' ? rate : undefined,
      pitch: typeof pitch === 'number' ? pitch : undefined,
    });

    ensureDir();
    const fileName = `${Date.now()}_${engine}_${crypto.randomBytes(3).toString('hex')}.${result.extension}`;
    const filePath = path.join(AUDIO_DIR, fileName);
    fs.writeFileSync(filePath, result.buffer);

    // Rough duration estimate (MP3 ~24-32 kbps for TTS ≈ 3-4 KB/sec)
    const durationSec = result.buffer.length / 3500;

    if (save) {
      await connectDB();
      const active = await characters.findOne({ isActive: true });
      await audioClips.create({
        characterId: active?.id ?? null,
        filePath,
        transcript: text,
        language: language || null,
        voiceEngine: engine,
        voiceId: voice || null,
        rate: typeof rate === 'number' ? rate : undefined,
        pitch: typeof pitch === 'number' ? pitch : undefined,
        durationSec,
      });
    }

    return NextResponse.json({
      publicPath: `/storage/audio/${fileName}`,
      fileName,
      durationSec,
      engine,
      contentType: result.contentType,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('TTS error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
