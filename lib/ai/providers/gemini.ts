/**
 * Google Gemini — generous free tier for text.
 * Models:  GET  https://generativelanguage.googleapis.com/v1beta/models?key={KEY}
 * Generate: POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={KEY}
 */
import type {
  ProviderModule, AIModel, TextGenInput, TextGenResult, ProviderCreds,
} from './types';

interface GeminiModel {
  name: string;
  displayName?: string;
  description?: string;
  inputTokenLimit?: number;
  supportedGenerationMethods?: string[];
}

export const gemini: ProviderModule = {
  meta: {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'Free tier with generous quotas. Multimodal text generation.',
    homepageUrl: 'https://aistudio.google.com/apikey',
    keysHelp: 'Create a free key at aistudio.google.com/apikey.',
    requiresKey: true,
    capabilities: { text: true },
    defaultModels: [
      { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', kind: 'text', provider: 'gemini', free: true },
      { id: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite', kind: 'text', provider: 'gemini', free: true },
      { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', kind: 'text', provider: 'gemini', free: true },
      { id: 'gemini-1.5-flash-8b', label: 'Gemini 1.5 Flash 8B', kind: 'text', provider: 'gemini', free: true },
      { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', kind: 'text', provider: 'gemini', free: true },
    ],
  },

  async listModels(creds?: ProviderCreds) {
    if (!creds?.apiKey) return gemini.meta.defaultModels ?? [];
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${creds.apiKey}`);
      if (!r.ok) return gemini.meta.defaultModels ?? [];
      const data = (await r.json()) as { models: GeminiModel[] };
      return data.models
        .filter((m) => (m.supportedGenerationMethods || []).includes('generateContent'))
        .map<AIModel>((m) => {
          const id = m.name.replace(/^models\//, '');
          return {
            id, label: m.displayName || id,
            kind: 'text', provider: 'gemini', free: true,
            description: m.description, contextLength: m.inputTokenLimit,
          };
        });
    } catch {
      return gemini.meta.defaultModels ?? [];
    }
  },

  async generateText(input: TextGenInput): Promise<TextGenResult> {
    if (!input.apiKey) throw new Error('Gemini requires an API key.');
    const model = input.model || 'gemini-2.0-flash';

    // Convert OpenAI-style messages to Gemini contents
    const systemMsg = input.messages.find((m) => m.role === 'system');
    const contents = input.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    const body: Record<string, unknown> = {
      contents,
      generationConfig: {
        temperature: input.temperature ?? 0.7,
        maxOutputTokens: input.maxTokens ?? 2048,
      },
    };
    if (systemMsg) {
      body.systemInstruction = { parts: [{ text: systemMsg.content }] };
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${input.apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Gemini error ${res.status}: ${await res.text()}`);
    const json = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
    };
    const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') ?? '';
    return {
      text, model,
      usage: {
        promptTokens: json.usageMetadata?.promptTokenCount,
        completionTokens: json.usageMetadata?.candidatesTokenCount,
      },
    };
  },
};
