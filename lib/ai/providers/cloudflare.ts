/**
 * Cloudflare Workers AI provider.
 * Free tier ~10,000 neurons/day. Requires Account ID + API Token.
 *
 * Models endpoint: https://api.cloudflare.com/client/v4/accounts/{id}/ai/models/search
 * Run endpoint:    https://api.cloudflare.com/client/v4/accounts/{id}/ai/run/{model}
 */
import type {
  ProviderModule, AIModel, ImageGenInput, ImageGenResult, TextGenInput, TextGenResult, ProviderCreds,
} from './types';

interface CfModel {
  name: string;
  description?: string;
  task?: { name?: string };
  properties?: Array<{ property_id: string; value: string }>;
}

export const cloudflare: ProviderModule = {
  meta: {
    id: 'cloudflare',
    name: 'Cloudflare Workers AI',
    description: 'Flux, SDXL, Llama, Mistral & more. ~10k neurons/day free.',
    homepageUrl: 'https://dash.cloudflare.com',
    keysHelp: 'Create an API token: My Profile → API Tokens → Workers AI template.',
    requiresKey: true,
    requiresAccount: true,
    capabilities: { image: true, text: true },
    defaultModels: [
      { id: '@cf/black-forest-labs/flux-1-schnell', label: 'Flux 1 Schnell', kind: 'image', provider: 'cloudflare', free: true },
      { id: '@cf/stabilityai/stable-diffusion-xl-base-1.0', label: 'SDXL Base', kind: 'image', provider: 'cloudflare', free: true },
      { id: '@cf/lykon/dreamshaper-8-lcm', label: 'DreamShaper 8 LCM', kind: 'image', provider: 'cloudflare', free: true },
      { id: '@cf/bytedance/stable-diffusion-xl-lightning', label: 'SDXL Lightning', kind: 'image', provider: 'cloudflare', free: true },
      { id: '@cf/meta/llama-3.1-8b-instruct', label: 'Llama 3.1 8B Instruct', kind: 'text', provider: 'cloudflare', free: true },
      { id: '@cf/mistral/mistral-7b-instruct-v0.1', label: 'Mistral 7B', kind: 'text', provider: 'cloudflare', free: true },
      { id: '@cf/qwen/qwen1.5-14b-chat-awq', label: 'Qwen 1.5 14B', kind: 'text', provider: 'cloudflare', free: true },
    ],
  },

  async listModels(creds?: ProviderCreds) {
    const accountId = creds?.apiAccount;
    const token = creds?.apiKey;
    if (!accountId || !token) return cloudflare.meta.defaultModels ?? [];
    try {
      const r = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/models/search?per_page=100`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!r.ok) return cloudflare.meta.defaultModels ?? [];
      const data = (await r.json()) as { result?: CfModel[] };
      const out: AIModel[] = [];
      for (const m of data.result ?? []) {
        const task = (m.task?.name || '').toLowerCase();
        const isImage = task.includes('text-to-image');
        const isText = task.includes('text-generation') || task.includes('chat');
        if (!isImage && !isText) continue;
        out.push({
          id: m.name, label: m.name.split('/').pop() || m.name,
          kind: isImage ? 'image' : 'text',
          provider: 'cloudflare', free: true,
          description: m.description,
        });
      }
      return out.length > 0 ? out : (cloudflare.meta.defaultModels ?? []);
    } catch {
      return cloudflare.meta.defaultModels ?? [];
    }
  },

  async generateImage(input: ImageGenInput): Promise<ImageGenResult> {
    if (!input.apiAccount || !input.apiKey) {
      throw new Error('Cloudflare requires Account ID + API Token. Add them in AI Studio.');
    }
    const model = input.model || '@cf/black-forest-labs/flux-1-schnell';
    const seed = input.seed ?? Math.floor(Math.random() * 4294967295);

    const url = `https://api.cloudflare.com/client/v4/accounts/${input.apiAccount}/ai/run/${model}`;
    const body: Record<string, unknown> = {
      prompt: input.prompt,
      num_steps: model.includes('flux') ? 4 : 20,
      seed,
    };
    if (input.negativePrompt && !model.includes('flux')) body.negative_prompt = input.negativePrompt;
    if (input.width) body.width = input.width;
    if (input.height) body.height = input.height;

    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${input.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Cloudflare AI error ${res.status}: ${await res.text()}`);

    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      const json = (await res.json()) as { result?: { image?: string } };
      const b64 = json?.result?.image;
      if (!b64) throw new Error('Cloudflare returned no image');
      return { buffer: Buffer.from(b64, 'base64'), model, seed, contentType: 'image/png' };
    }
    return { buffer: Buffer.from(await res.arrayBuffer()), model, seed, contentType: ct };
  },

  async generateText(input: TextGenInput): Promise<TextGenResult> {
    // We need creds — they're carried via "apiKey" + a special "account|token" packing OR explicit fields.
    // Since this provider needs both, the route handler resolves them and re-injects.
    const creds = parseCloudflareKey(input.apiKey);
    if (!creds) throw new Error('Cloudflare requires Account ID + API Token. Add them in AI Studio.');
    const model = input.model || '@cf/meta/llama-3.1-8b-instruct';
    const url = `https://api.cloudflare.com/client/v4/accounts/${creds.accountId}/ai/run/${model}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${creds.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: input.messages,
        temperature: input.temperature ?? 0.7,
        max_tokens: input.maxTokens,
      }),
    });
    if (!res.ok) throw new Error(`Cloudflare text error ${res.status}: ${await res.text()}`);
    const json = (await res.json()) as { result?: { response?: string } };
    return { text: json.result?.response ?? '', model };
  },
};

/** Pack/unpack helper so generateText() can carry both creds via the single apiKey slot. */
export function packCloudflareKey(accountId: string, token: string): string {
  return `${accountId}|${token}`;
}
function parseCloudflareKey(packed?: string): { accountId: string; token: string } | null {
  if (!packed || !packed.includes('|')) return null;
  const [accountId, token] = packed.split('|');
  if (!accountId || !token) return null;
  return { accountId, token };
}
