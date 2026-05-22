/**
 * Shared types for the multi-provider AI system.
 *
 * Every provider module conforms to a slice of {@link ProviderModule}:
 *  - listModels(key?)  — fetch live models from the provider (when supported)
 *  - generateImage()   — text-to-image generation
 *  - generateText()    — chat/completion text generation
 *
 * The registry then advertises which capabilities each provider supports.
 */

export type ProviderId =
  | 'pollinations'
  | 'cloudflare'
  | 'huggingface'
  | 'openrouter'
  | 'groq'
  | 'gemini';

export type ModelKind = 'image' | 'text';

export interface AIModel {
  id: string;          // canonical provider model id, e.g. "flux", "@cf/black-forest-labs/flux-1-schnell"
  label: string;       // human label
  kind: ModelKind;
  provider: ProviderId;
  free?: boolean;
  description?: string;
  contextLength?: number;
}

export interface ImageGenInput {
  prompt: string;
  model: string;
  width?: number;
  height?: number;
  seed?: number;
  negativePrompt?: string;
  apiKey?: string;
  apiAccount?: string; // for cloudflare account id
}

export interface ImageGenResult {
  buffer: Buffer;
  model: string;
  seed: number;
  contentType?: string;
}

export interface TextMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface TextGenInput {
  messages: TextMessage[];
  model: string;
  temperature?: number;
  maxTokens?: number;
  apiKey?: string;
}

export interface TextGenResult {
  text: string;
  model: string;
  usage?: { promptTokens?: number; completionTokens?: number };
}

export interface ProviderMeta {
  id: ProviderId;
  name: string;
  description: string;
  homepageUrl: string;
  keysHelp?: string;
  requiresKey: boolean;
  // Cloudflare needs both Account ID + API Token
  requiresAccount?: boolean;
  capabilities: { image?: boolean; text?: boolean };
  /** Used when listModels() fails or isn't supported. */
  defaultModels?: AIModel[];
}

export interface ProviderModule {
  meta: ProviderMeta;
  listModels?(creds?: ProviderCreds): Promise<AIModel[]>;
  generateImage?(input: ImageGenInput): Promise<ImageGenResult>;
  generateText?(input: TextGenInput): Promise<TextGenResult>;
}

export interface ProviderCreds {
  apiKey?: string;
  apiAccount?: string; // cloudflare account id
}
