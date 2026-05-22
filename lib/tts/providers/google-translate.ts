/**
 * Google Translate TTS — keyless, multilingual including Bangla.
 *
 * Endpoint: https://translate.google.com/translate_tts?ie=UTF-8&q={text}&tl={lang}&client=tw-ob
 *
 * Limitations:
 *  - Per-request char limit ~200; longer text is auto-chunked & concatenated.
 *  - Only one voice per language (Google's default robotic voice).
 *  - Quality is lower than Edge/ElevenLabs but works as a quick fallback for
 *    languages Edge can't reach with default voices.
 */
import type {
  TtsProviderModule, SynthesizeInput, SynthesizeResult, TtsVoice,
} from '../types';

const LANGS: Array<{ code: string; label: string }> = [
  { code: 'bn', label: 'Bangla' },
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi' },
  { code: 'ar', label: 'Arabic' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'ja', label: 'Japanese' },
  { code: 'zh-CN', label: 'Chinese (Mandarin)' },
  { code: 'ko', label: 'Korean' },
  { code: 'it', label: 'Italian' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'ru', label: 'Russian' },
  { code: 'tr', label: 'Turkish' },
  { code: 'ur', label: 'Urdu' },
  { code: 'id', label: 'Indonesian' },
  { code: 'ms', label: 'Malay' },
  { code: 'th', label: 'Thai' },
  { code: 'vi', label: 'Vietnamese' },
];

const VOICES: TtsVoice[] = LANGS.map((l) => ({
  id: l.code,
  label: `${l.label} (default)`,
  language: l.code,
  provider: 'google-translate',
}));

const MAX_PER_CHUNK = 190;

/** Split text into sentence-ish chunks ≤ MAX_PER_CHUNK characters. */
function chunkText(text: string): string[] {
  if (text.length <= MAX_PER_CHUNK) return [text];
  const out: string[] = [];
  // Prefer punctuation boundaries (Bangla danda, period, comma)
  const pieces = text.split(/([।.!?]+\s*|\n+)/);
  let buf = '';
  for (const p of pieces) {
    if ((buf + p).length > MAX_PER_CHUNK) {
      if (buf.trim()) out.push(buf.trim());
      buf = p;
      // If a single piece is still too long, split by spaces
      while (buf.length > MAX_PER_CHUNK) {
        const cut = buf.lastIndexOf(' ', MAX_PER_CHUNK);
        const at = cut > 0 ? cut : MAX_PER_CHUNK;
        out.push(buf.slice(0, at).trim());
        buf = buf.slice(at).trim();
      }
    } else {
      buf += p;
    }
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

export const googleTranslate: TtsProviderModule = {
  meta: {
    id: 'google-translate',
    name: 'Google Translate TTS',
    description: 'Keyless, basic multilingual TTS (Bangla, Hindi, Arabic & more).',
    homepageUrl: 'https://translate.google.com',
    requiresKey: false,
    supportsBangla: true,
    freeTier: 'No key, ~200 chars per chunk (auto-chunked)',
    maxChars: 50000, // we chunk internally
    defaultVoices: VOICES,
  },

  async listVoices() { return VOICES; },

  async synthesize({ text, voice }: SynthesizeInput): Promise<SynthesizeResult> {
    const lang = voice || 'bn';
    const chunks = chunkText(text);
    const buffers: Buffer[] = [];
    for (let i = 0; i < chunks.length; i++) {
      const params = new URLSearchParams({
        ie: 'UTF-8',
        q: chunks[i],
        tl: lang,
        client: 'tw-ob',
        idx: String(i),
        total: String(chunks.length),
        textlen: String(chunks[i].length),
      });
      const url = `https://translate.google.com/translate_tts?${params}`;
      const res = await fetch(url, {
        headers: {
          // Google's TTS endpoint is picky about user agents
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://translate.google.com/',
        },
      });
      if (!res.ok) throw new Error(`Google Translate TTS error ${res.status}`);
      buffers.push(Buffer.from(await res.arrayBuffer()));
    }
    return {
      buffer: Buffer.concat(buffers),
      contentType: 'audio/mpeg',
      extension: 'mp3',
    };
  },
};
