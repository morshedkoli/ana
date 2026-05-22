/**
 * Hugging Face Inference TTS.
 *
 * Free Inference API tier with hourly quota. We expose a curated set of
 * known-warm TTS models. Each "voice" id is actually a HF repo path; the
 * synthesize step calls https://api-inference.huggingface.co/models/{repo}.
 */
import type {
  TtsProviderModule, SynthesizeInput, SynthesizeResult, TtsVoice,
} from '../types';

const VOICES: TtsVoice[] = [
  { id: 'facebook/mms-tts-ben', label: 'MMS Bangla (Bengali)', language: 'bn', provider: 'huggingface' },
  { id: 'facebook/mms-tts-eng', label: 'MMS English', language: 'en', provider: 'huggingface' },
  { id: 'facebook/mms-tts-hin', label: 'MMS Hindi', language: 'hi', provider: 'huggingface' },
  { id: 'facebook/mms-tts-urd-script_arabic', label: 'MMS Urdu', language: 'ur', provider: 'huggingface' },
  { id: 'facebook/mms-tts-ara', label: 'MMS Arabic', language: 'ar', provider: 'huggingface' },
  { id: 'facebook/mms-tts-spa', label: 'MMS Spanish', language: 'es', provider: 'huggingface' },
  { id: 'facebook/mms-tts-fra', label: 'MMS French', language: 'fr', provider: 'huggingface' },
  { id: 'facebook/mms-tts-por', label: 'MMS Portuguese', language: 'pt', provider: 'huggingface' },
  { id: 'microsoft/speecht5_tts', label: 'SpeechT5 (English)', language: 'en', provider: 'huggingface' },
  { id: 'suno/bark-small', label: 'Bark Small (multi-lingual, expressive)', provider: 'huggingface' },
];

export const huggingfaceTts: TtsProviderModule = {
  meta: {
    id: 'huggingface',
    name: 'Hugging Face TTS',
    description: 'MMS, SpeechT5, Bark on the free Inference API. Bangla via mms-tts-ben.',
    homepageUrl: 'https://huggingface.co/settings/tokens',
    keysHelp: 'Get a free Read token at huggingface.co/settings/tokens.',
    requiresKey: true,
    supportsBangla: true,
    freeTier: 'Hourly quota on the public Inference API',
    maxChars: 1500,
    defaultVoices: VOICES,
  },

  async listVoices() { return VOICES; },

  async synthesize({ text, voice, apiKey }: SynthesizeInput): Promise<SynthesizeResult> {
    if (!apiKey) throw new Error('Hugging Face TTS requires a token.');
    const model = voice || 'facebook/mms-tts-ben';
    const res = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: text }),
    });
    if (!res.ok) throw new Error(`HF TTS error ${res.status}: ${await res.text()}`);
    const ct = res.headers.get('content-type') || '';
    if (!ct.startsWith('audio/') && !ct.startsWith('application/octet-stream')) {
      // Often a JSON error like {"error":"Model facebook/... is currently loading"}
      const txt = await res.text();
      throw new Error(`HF returned non-audio (${ct}): ${txt}`);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const ext = ct.includes('wav') ? 'wav' : ct.includes('flac') ? 'flac' : 'mp3';
    return { buffer: buf, contentType: ct || 'audio/mpeg', extension: ext };
  },
};
