import { NextResponse } from 'next/server';
import {
  listTtsMetas, isTtsConfigured, getDefaultTts, getTtsKey,
} from '@/lib/tts/registry';
import type { TtsProviderId } from '@/lib/tts/types';

/**
 * GET /api/tts/engines
 * Returns metadata for every TTS engine, configured state, and the default.
 */
export async function GET() {
  const metas = listTtsMetas();
  const defaultEngine = await getDefaultTts();
  const engines = await Promise.all(metas.map(async (m) => ({
    ...m,
    configured: await isTtsConfigured(m.id as TtsProviderId),
    hasKey: Boolean(await getTtsKey(m.id as TtsProviderId)),
  })));
  return NextResponse.json({ engines, defaultEngine });
}
