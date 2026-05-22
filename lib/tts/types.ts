/**
 * Shared types for the multi-provider TTS system.
 *
 * Every TTS engine implements a slice of {@link TtsProviderModule}:
 *  - listVoices() — return supported voices (live or static)
 *  - synthesize() — return MP3/WAV bytes
 *
 * Engines can store creds via `tts_key_{id}` settings keys.
 */

export type TtsProviderId =
  | 'edge'
  | 'streamelements'
  | 'google-translate'
  | 'pollinations'
  | 'elevenlabs'
  | 'huggingface';

export interface TtsVoice {
  id: string;
  label: string;
  language?: string;     // e.g. "bn-BD", "en-US"
  gender?: 'male' | 'female' | 'neutral';
  region?: string;
  provider: TtsProviderId;
  /** Optional preview MP3 URL. */
  previewUrl?: string;
}

export interface SynthesizeInput {
  text: string;
  voice: string;
  /** 0.5 - 2.0  (1 = normal). Some providers may approximate. */
  rate?: number;
  /** -50 .. +50 Hz (0 = normal). Some providers may approximate. */
  pitch?: number;
  apiKey?: string;
}

export interface SynthesizeResult {
  /** Raw audio bytes. */
  buffer: Buffer;
  /** "audio/mpeg", "audio/wav", etc. */
  contentType: string;
  /** File extension hint without the leading dot. */
  extension: string;
}

export interface TtsProviderMeta {
  id: TtsProviderId;
  name: string;
  description: string;
  homepageUrl: string;
  keysHelp?: string;
  requiresKey: boolean;
  /** True if the provider can do Bangla. */
  supportsBangla?: boolean;
  /** Free tier description for the UI. */
  freeTier?: string;
  /** Default voices used if listVoices() can't be reached. */
  defaultVoices?: TtsVoice[];
  /** Maximum characters per request (we'll chunk above this). */
  maxChars?: number;
}

export interface TtsProviderModule {
  meta: TtsProviderMeta;
  listVoices?(creds?: { apiKey?: string }): Promise<TtsVoice[]>;
  synthesize(input: SynthesizeInput): Promise<SynthesizeResult>;
}
