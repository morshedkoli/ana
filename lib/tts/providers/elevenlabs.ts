/**
 * ElevenLabs — best-in-class voice quality with a free tier.
 *
 * Free tier: 10,000 characters/month.
 *
 * Voices: GET https://api.elevenlabs.io/v1/voices
 * Synth:  POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}
 *
 * Bangla support: via `eleven_multilingual_v2` model, which handles 30+ langs.
 */
import type {
  TtsProviderModule, SynthesizeInput, SynthesizeResult, TtsVoice,
} from '../types';

interface ElevenVoice {
  voice_id: string;
  name?: string;
  preview_url?: string;
  labels?: { gender?: string; accent?: string; description?: string };
  category?: string;
}

const STARTERS: TtsVoice[] = [
  { id: '21m00Tcm4TlvDq8ikWAM', label: 'Rachel (Female, US)', language: 'en-US', gender: 'female', provider: 'elevenlabs' },
  { id: 'AZnzlk1XvdvUeBnXmlld', label: 'Domi (Female, US)', language: 'en-US', gender: 'female', provider: 'elevenlabs' },
  { id: 'EXAVITQu4vr4xnSDxMaL', label: 'Bella (Female, US)', language: 'en-US', gender: 'female', provider: 'elevenlabs' },
  { id: 'ErXwobaYiN019PkySvjV', label: 'Antoni (Male, US)', language: 'en-US', gender: 'male', provider: 'elevenlabs' },
  { id: 'TxGEqnHWrfWFTfGW9XjX', label: 'Josh (Male, US)', language: 'en-US', gender: 'male', provider: 'elevenlabs' },
];

export const elevenlabs: TtsProviderModule = {
  meta: {
    id: 'elevenlabs',
    name: 'ElevenLabs',
    description: 'Premium expressive voices. Multilingual (incl. Bangla via v2).',
    homepageUrl: 'https://elevenlabs.io/app/settings/api-keys',
    keysHelp: 'Free key at elevenlabs.io/app/settings/api-keys. Free tier: 10k chars/month.',
    requiresKey: true,
    supportsBangla: true,
    freeTier: '10,000 characters/month',
    maxChars: 5000,
    defaultVoices: STARTERS,
  },

  async listVoices(creds) {
    if (!creds?.apiKey) return STARTERS;
    try {
      const r = await fetch('https://api.elevenlabs.io/v1/voices', {
        headers: { 'xi-api-key': creds.apiKey },
      });
      if (!r.ok) return STARTERS;
      const data = (await r.json()) as { voices: ElevenVoice[] };
      return data.voices.map<TtsVoice>((v) => ({
        id: v.voice_id,
        label: `${v.name || v.voice_id}${v.labels?.gender ? ` (${v.labels.gender})` : ''}${v.labels?.accent ? ` · ${v.labels.accent}` : ''}`,
        gender: (v.labels?.gender === 'male' ? 'male' : v.labels?.gender === 'female' ? 'female' : undefined),
        provider: 'elevenlabs',
        previewUrl: v.preview_url,
      }));
    } catch {
      return STARTERS;
    }
  },

  async synthesize({ text, voice, apiKey }: SynthesizeInput): Promise<SynthesizeResult> {
    if (!apiKey) throw new Error('ElevenLabs requires an API key.');
    const voiceId = voice || STARTERS[0].id;
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });
    if (!res.ok) throw new Error(`ElevenLabs error ${res.status}: ${await res.text()}`);
    const buf = Buffer.from(await res.arrayBuffer());
    return { buffer: buf, contentType: 'audio/mpeg', extension: 'mp3' };
  },
};
