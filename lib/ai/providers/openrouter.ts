/**
 * OpenRouter — unified gateway for many LLMs. Filter for free models only.
 * Models: https://openrouter.ai/api/v1/models
 * Chat:   https://openrouter.ai/api/v1/chat/completions
 */
import type {
  ProviderModule, AIModel, TextGenInput, TextGenResult, ProviderCreds,
} from './types';

interface OrModel {
  id: string;
  name?: string;
  description?: string;
  context_length?: number;
  pricing?: { prompt?: string; completion?: string };
}

export const openrouter: ProviderModule = {
  meta: {
    id: 'openrouter',
    name: 'OpenRouter',
    description: 'Unified LLM gateway. Hundreds of models, including free ones.',
    homepageUrl: 'https://openrouter.ai/keys',
    keysHelp: 'Create a free key at openrouter.ai/keys. Free models cost 0$.',
    requiresKey: true,
    capabilities: { text: true },
    defaultModels: [
      { id: 'meta-llama/llama-3.1-8b-instruct:free', label: 'Llama 3.1 8B (free)', kind: 'text', provider: 'openrouter', free: true },
      { id: 'google/gemini-2.0-flash-exp:free', label: 'Gemini 2.0 Flash (free)', kind: 'text', provider: 'openrouter', free: true },
      { id: 'mistralai/mistral-7b-instruct:free', label: 'Mistral 7B (free)', kind: 'text', provider: 'openrouter', free: true },
      { id: 'qwen/qwen-2-7b-instruct:free', label: 'Qwen 2 7B (free)', kind: 'text', provider: 'openrouter', free: true },
    ],
  },

  async listModels(creds?: ProviderCreds) {
    const headers: Record<string, string> = creds?.apiKey
      ? { Authorization: `Bearer ${creds.apiKey}` } : {};
    try {
      const r = await fetch('https://openrouter.ai/api/v1/models', { headers });
      if (!r.ok) return openrouter.meta.defaultModels ?? [];
      const data = (await r.json()) as { data: OrModel[] };
      const out: AIModel[] = [];
      for (const m of data.data) {
        const isFree = m.id.endsWith(':free') ||
          (Number(m.pricing?.prompt) === 0 && Number(m.pricing?.completion) === 0);
        if (!isFree) continue;
        out.push({
          id: m.id, label: m.name || m.id,
          kind: 'text', provider: 'openrouter', free: true,
          description: m.description, contextLength: m.context_length,
        });
      }
      return out.length > 0 ? out : (openrouter.meta.defaultModels ?? []);
    } catch {
      return openrouter.meta.defaultModels ?? [];
    }
  },

  async generateText(input: TextGenInput): Promise<TextGenResult> {
    if (!input.apiKey) throw new Error('OpenRouter requires an API key.');
    const model = input.model || 'meta-llama/llama-3.1-8b-instruct:free';
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://influencer-studio.local',
        'X-Title': 'Influencer Studio',
      },
      body: JSON.stringify({
        model,
        messages: input.messages,
        temperature: input.temperature ?? 0.7,
        max_tokens: input.maxTokens,
      }),
    });
    if (!res.ok) throw new Error(`OpenRouter error ${res.status}: ${await res.text()}`);
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
