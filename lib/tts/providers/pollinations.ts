/**
 * Pollinations TTS — `openai-audio` model on the Pollinations gateway.
 *
 * GET https://text.pollinations.ai/{prompt}?model=openai-audio&voice={voice}
 * Returns audio/mpeg.
 *
 * No key required for the public endpoint, though a key is recommended to
 * avoid rate-limit hiccups.
 */
import type {
  TtsProviderModule, SynthesizeInput, SynthesizeResult, TtsVoice,
} from '../types';

// OpenAI-style voices supported by Pollinations' openai-audio model
const VOICES: TtsVoice[] = [
  { id: 'alloy', label: 'Alloy (neutral)', language: 'en', gender: 'neutral', provider: 'pollinations' },
  { id: 'echo', label: 'Echo (male)', language: 'en', gender: 'male', provider: 'pollinations' },
  { id: 'fable', label: 'Fable (British, male)', language: 'en', gender: 'male', provider: 'pollinations' },
  { id: 'onyx', label: 'Onyx (deep, male)', language: 'en', gender: 'male', provider: 'pollinations' },
  { id: 'nova', label: 'Nova (warm, female)', language: 'en', gender: 'female', provider: 'pollinations' },
  { id: 'shimmer', label: 'Shimmer (bright, female)', language: 'en', gender: 'female', provider: 'pollinations' },
  { id: 'coral', label: 'Coral (smooth, female)', language: 'en', gender: 'female', provider: 'pollinations' },
  { id: 'verse', label: 'Verse (expressive)', language: 'en', gender: 'neutral', provider: 'pollinations' },
  { id: 'ballad', label: 'Ballad (storyteller)', language: 'en', gender: 'neutral', provider: 'pollinations' },
  { id: 'ash', label: 'Ash (warm)', language: 'en', gender: 'male', provider: 'pollinations' },
  { id: 'sage', label: 'Sage (calm)', language: 'en', gender: 'female', provider: 'pollinations' },
];

export const pollinationsTts: TtsProviderModule = {
  meta: {
    id: 'pollinations',
    name: 'Pollinations Audio',
    description: 'OpenAI-style voices via Pollinations. Optional key for higher limits.',
    homepageUrl: 'https://pollinations.ai',
    keysHelp: 'Optional. Sign up at enter.pollinations.ai for a key with higher limits.',
    requiresKey: false,
    supportsBangla: false,
    freeTier: 'Public endpoint with fair-use limits',
    maxChars: 4000,
    defaultVoices: VOICES,
  },

  async listVoices() { return VOICES; },

  async synthesize({ text, voice, apiKey }: SynthesizeInput): Promise<SynthesizeResult> {
    const v = voice || 'nova';
    // Use the Bearer-auth endpoint when a key is provided; else the public GET.
    const params = new URLSearchParams({ model: 'openai-audio', voice: v });
    const url = `https://text.pollinations.ai/${encodeURIComponent(text)}?${params}`;
    const headers: Record<string, string> = {};
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`Pollinations TTS error ${res.status}: ${await res.text()}`);
    const ct = res.headers.get('content-type') || 'audio/mpeg';
    const buf = Buffer.from(await res.arrayBuffer());
    return {
      buffer: buf,
      contentType: ct,
      extension: ct.includes('wav') ? 'wav' : 'mp3',
    };
  },
};
