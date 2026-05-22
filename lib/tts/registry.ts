/**
 * TTS provider registry.
 *
 * Settings keys (stored in the `settings` collection):
 *  - tts_key_{id}      → API key for that engine (when required)
 *  - tts_default       → preferred engine id
 */
import { connectDB, settings } from '@/lib/db/client';
import type {
  TtsProviderId, TtsProviderModule, TtsProviderMeta, TtsVoice, SynthesizeResult,
} from './types';
import { edge } from './providers/edge';
import { streamelements } from './providers/streamelements';
import { googleTranslate } from './providers/google-translate';
import { pollinationsTts } from './providers/pollinations';
import { elevenlabs } from './providers/elevenlabs';
import { huggingfaceTts } from './providers/huggingface';

export const TTS_PROVIDERS: Record<TtsProviderId, TtsProviderModule> = {
  edge,
  streamelements,
  'google-translate': googleTranslate,
  pollinations: pollinationsTts,
  elevenlabs,
  huggingface: huggingfaceTts,
};

const DEFAULT_KEY = 'tts_default';
// google-translate is keyless and supports Bangla, so it's the safest
// out-of-the-box default. Users can switch to Edge TTS in the Configure
// modal if they install python + edge-tts on the server (best Bangla quality),
// or to ElevenLabs/Pollinations/etc.
const DEFAULT_PROVIDER: TtsProviderId = 'google-translate';

function keyName(id: TtsProviderId) { return `tts_key_${id}`; }

export function listTtsMetas(): TtsProviderMeta[] {
  return Object.values(TTS_PROVIDERS).map((p) => p.meta);
}

export function getTts(id: TtsProviderId): TtsProviderModule {
  const m = TTS_PROVIDERS[id];
  if (!m) throw new Error(`Unknown TTS provider: ${id}`);
  return m;
}

export async function saveTtsKey(id: TtsProviderId, apiKey: string): Promise<void> {
  await connectDB();
  await settings.findOneAndUpdate(
    { key: keyName(id) },
    { $set: { value: apiKey, updatedAt: new Date() } },
    { upsert: true }
  );
}

export async function clearTtsKey(id: TtsProviderId): Promise<void> {
  await connectDB();
  await settings.deleteOne({ key: keyName(id) });
}

export async function getTtsKey(id: TtsProviderId): Promise<string> {
  await connectDB();
  const doc = await settings.findOne({ key: keyName(id) });
  return (doc?.value as string) || process.env[`TTS_KEY_${id.toUpperCase().replace(/-/g, '_')}`] || '';
}

export async function isTtsConfigured(id: TtsProviderId): Promise<boolean> {
  const meta = TTS_PROVIDERS[id].meta;
  if (!meta.requiresKey) return true;
  return Boolean(await getTtsKey(id));
}

export async function getDefaultTts(): Promise<TtsProviderId> {
  await connectDB();
  const doc = await settings.findOne({ key: DEFAULT_KEY });
  const value = (doc?.value as TtsProviderId) || DEFAULT_PROVIDER;
  return Object.keys(TTS_PROVIDERS).includes(value) ? value : DEFAULT_PROVIDER;
}

export async function setDefaultTts(id: TtsProviderId): Promise<void> {
  await connectDB();
  await settings.findOneAndUpdate(
    { key: DEFAULT_KEY },
    { $set: { value: id, updatedAt: new Date() } },
    { upsert: true }
  );
}

export async function listVoicesFor(id: TtsProviderId): Promise<TtsVoice[]> {
  const m = getTts(id);
  if (!m.listVoices) return m.meta.defaultVoices ?? [];
  const apiKey = m.meta.requiresKey ? await getTtsKey(id) : undefined;
  return m.listVoices(apiKey ? { apiKey } : undefined);
}

export async function synthesizeWith(
  id: TtsProviderId,
  opts: { text: string; voice: string; rate?: number; pitch?: number }
): Promise<SynthesizeResult> {
  const m = getTts(id);
  const apiKey = m.meta.requiresKey ? await getTtsKey(id) : await getTtsKey(id) || undefined;
  return m.synthesize({ ...opts, apiKey });
}
