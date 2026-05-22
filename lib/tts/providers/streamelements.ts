/**
 * StreamElements — keyless wrapper around AWS Polly voices.
 * GET https://api.streamelements.com/kappa/v2/speech?voice={voice}&text={text}
 *
 * No API key, no rate-limit advertised, returns MP3 directly.
 * English-only (no Bangla support).
 */
import type {
  TtsProviderModule, SynthesizeInput, SynthesizeResult, TtsVoice,
} from '../types';

// Curated subset of Amazon Polly voices that StreamElements supports.
const VOICES: TtsVoice[] = [
  // English (US)
  { id: 'Joanna', label: 'Joanna (US, Female)', language: 'en-US', gender: 'female', provider: 'streamelements' },
  { id: 'Matthew', label: 'Matthew (US, Male)', language: 'en-US', gender: 'male', provider: 'streamelements' },
  { id: 'Salli', label: 'Salli (US, Female)', language: 'en-US', gender: 'female', provider: 'streamelements' },
  { id: 'Joey', label: 'Joey (US, Male)', language: 'en-US', gender: 'male', provider: 'streamelements' },
  { id: 'Kendra', label: 'Kendra (US, Female)', language: 'en-US', gender: 'female', provider: 'streamelements' },
  { id: 'Justin', label: 'Justin (US, Child M)', language: 'en-US', gender: 'male', provider: 'streamelements' },
  { id: 'Ivy', label: 'Ivy (US, Child F)', language: 'en-US', gender: 'female', provider: 'streamelements' },
  // English (UK / AU / IN)
  { id: 'Brian', label: 'Brian (UK, Male)', language: 'en-GB', gender: 'male', provider: 'streamelements' },
  { id: 'Amy', label: 'Amy (UK, Female)', language: 'en-GB', gender: 'female', provider: 'streamelements' },
  { id: 'Emma', label: 'Emma (UK, Female)', language: 'en-GB', gender: 'female', provider: 'streamelements' },
  { id: 'Nicole', label: 'Nicole (AU, Female)', language: 'en-AU', gender: 'female', provider: 'streamelements' },
  { id: 'Russell', label: 'Russell (AU, Male)', language: 'en-AU', gender: 'male', provider: 'streamelements' },
  { id: 'Aditi', label: 'Aditi (IN, Female)', language: 'en-IN', gender: 'female', provider: 'streamelements' },
  { id: 'Raveena', label: 'Raveena (IN, Female)', language: 'en-IN', gender: 'female', provider: 'streamelements' },
  // Other languages (Polly)
  { id: 'Celine', label: 'Céline (French)', language: 'fr-FR', gender: 'female', provider: 'streamelements' },
  { id: 'Marlene', label: 'Marlene (German)', language: 'de-DE', gender: 'female', provider: 'streamelements' },
  { id: 'Conchita', label: 'Conchita (Spanish)', language: 'es-ES', gender: 'female', provider: 'streamelements' },
  { id: 'Mizuki', label: 'Mizuki (Japanese)', language: 'ja-JP', gender: 'female', provider: 'streamelements' },
  { id: 'Zhiyu', label: 'Zhiyu (Chinese)', language: 'zh-CN', gender: 'female', provider: 'streamelements' },
  { id: 'Hans', label: 'Hans (German, Male)', language: 'de-DE', gender: 'male', provider: 'streamelements' },
];

export const streamelements: TtsProviderModule = {
  meta: {
    id: 'streamelements',
    name: 'StreamElements',
    description: 'Keyless wrapper around Amazon Polly. Great English voices.',
    homepageUrl: 'https://streamelements.com',
    requiresKey: false,
    supportsBangla: false,
    freeTier: 'No key, fair-use rate limits',
    maxChars: 1000,
    defaultVoices: VOICES,
  },

  async listVoices() { return VOICES; },

  async synthesize({ text, voice }: SynthesizeInput): Promise<SynthesizeResult> {
    const safeVoice = voice || 'Joanna';
    const url = `https://api.streamelements.com/kappa/v2/speech?voice=${encodeURIComponent(safeVoice)}&text=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`StreamElements error ${res.status}: ${await res.text()}`);
    const buf = Buffer.from(await res.arrayBuffer());
    return { buffer: buf, contentType: res.headers.get('content-type') || 'audio/mpeg', extension: 'mp3' };
  },
};
