/**
 * Pollinations.ai — completely free, NO API key. Image + text.
 * Endpoints:
 *  - GET  https://image.pollinations.ai/prompt/{prompt}?...
 *  - GET  https://image.pollinations.ai/models               (JSON array)
 *  - POST https://text.pollinations.ai/openai                (OpenAI-compatible)
 *  - GET  https://text.pollinations.ai/models                (JSON array)
 */
import type {
  ProviderModule, AIModel, ImageGenInput, ImageGenResult, TextGenInput, TextGenResult,
} from './types';

export const pollinations: ProviderModule = {
  meta: {
    id: 'pollinations',
    name: 'Pollinations',
    description: 'Free, unlimited, no key required. Image + text.',
    homepageUrl: 'https://pollinations.ai',
    requiresKey: false,
    capabilities: { image: true, text: true },
    defaultModels: [
      { id: 'flux', label: 'Flux', kind: 'image', provider: 'pollinations', free: true },
      { id: 'turbo', label: 'Turbo (fastest)', kind: 'image', provider: 'pollinations', free: true },
      { id: 'flux-realism', label: 'Flux Realism', kind: 'image', provider: 'pollinations', free: true },
      { id: 'flux-anime', label: 'Flux Anime', kind: 'image', provider: 'pollinations', free: true },
      { id: 'openai', label: 'OpenAI (mirror)', kind: 'text', provider: 'pollinations', free: true },
      { id: 'mistral', label: 'Mistral', kind: 'text', provider: 'pollinations', free: true },
    ],
  },

  async listModels() {
    const out: AIModel[] = [];
    try {
      const r = await fetch('https://image.pollinations.ai/models');
      if (r.ok) {
        const data = (await r.json()) as string[];
        for (const id of data) {
          out.push({ id, label: id, kind: 'image', provider: 'pollinations', free: true });
        }
      }
    } catch { /* ignore */ }
    try {
      const r = await fetch('https://text.pollinations.ai/models');
      if (r.ok) {
        const raw = (await r.json()) as Array<string | { name?: string; description?: string }>;
        for (const m of raw) {
          if (typeof m === 'string') {
            out.push({ id: m, label: m, kind: 'text', provider: 'pollinations', free: true });
          } else if (m.name) {
            out.push({
              id: m.name, label: m.description || m.name,
              kind: 'text', provider: 'pollinations', free: true,
              description: m.description,
            });
          }
        }
      }
    } catch { /* ignore */ }
    return out.length > 0 ? out : (pollinations.meta.defaultModels ?? []);
  },

  async generateImage(input: ImageGenInput): Promise<ImageGenResult> {
    const seed = input.seed ?? Math.floor(Math.random() * 4294967295);
    const params = new URLSearchParams({
      width: String(input.width ?? 1024),
      height: String(input.height ?? 1024),
      seed: String(seed),
      model: input.model || 'flux',
      nologo: 'true',
    });
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(input.prompt)}?${params}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Pollinations error ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    return { buffer: buf, model: input.model || 'flux', seed, contentType: res.headers.get('content-type') || 'image/png' };
  },

  async generateText(input: TextGenInput): Promise<TextGenResult> {
    const res = await fetch('https://text.pollinations.ai/openai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: input.model || 'openai',
        messages: input.messages,
        temperature: input.temperature ?? 0.7,
        max_tokens: input.maxTokens,
      }),
    });
    if (!res.ok) throw new Error(`Pollinations text error ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const text = data.choices?.[0]?.message?.content ?? '';
    return { text, model: input.model || 'openai' };
  },
};
