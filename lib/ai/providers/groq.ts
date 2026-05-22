/**
 * Groq — lightning-fast LLM inference. Generous free tier.
 * Models: https://api.groq.com/openai/v1/models
 * Chat:   https://api.groq.com/openai/v1/chat/completions
 */
import type {
  ProviderModule, AIModel, TextGenInput, TextGenResult, ProviderCreds,
} from './types';

interface GroqModel { id: string; owned_by?: string; context_window?: number; active?: boolean }

export const groq: ProviderModule = {
  meta: {
    id: 'groq',
    name: 'Groq',
    description: 'Ultra-fast LLM inference (Llama, Mixtral, Gemma). Free tier.',
    homepageUrl: 'https://console.groq.com/keys',
    keysHelp: 'Create a free key at console.groq.com/keys.',
    requiresKey: true,
    capabilities: { text: true },
    defaultModels: [
      { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B Versatile', kind: 'text', provider: 'groq', free: true },
      { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant', kind: 'text', provider: 'groq', free: true },
      { id: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B', kind: 'text', provider: 'groq', free: true },
      { id: 'gemma2-9b-it', label: 'Gemma 2 9B', kind: 'text', provider: 'groq', free: true },
    ],
  },

  async listModels(creds?: ProviderCreds) {
    if (!creds?.apiKey) return groq.meta.defaultModels ?? [];
    try {
      const r = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { Authorization: `Bearer ${creds.apiKey}` },
      });
      if (!r.ok) return groq.meta.defaultModels ?? [];
      const data = (await r.json()) as { data: GroqModel[] };
      return data.data
        .filter((m) => m.active !== false)
        .map<AIModel>((m) => ({
          id: m.id, label: m.id, kind: 'text', provider: 'groq', free: true,
          contextLength: m.context_window,
        }));
    } catch {
      return groq.meta.defaultModels ?? [];
    }
  },

  async generateText(input: TextGenInput): Promise<TextGenResult> {
    if (!input.apiKey) throw new Error('Groq requires an API key.');
    const model = input.model || 'llama-3.3-70b-versatile';
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${input.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: input.messages,
        temperature: input.temperature ?? 0.7,
        max_tokens: input.maxTokens,
      }),
    });
    if (!res.ok) throw new Error(`Groq error ${res.status}: ${await res.text()}`);
    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    return {
      text: json.choices?.[0]?.message?.content ?? '',
      model,
      usage: { promptTokens: json.usage?.prompt_tokens, completionTokens: json.usage?.completion_tokens },
    };
  },
};
