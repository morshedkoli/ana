/**
 * Hugging Face Inference API.
 * Free tier with hourly limits. Supports image + text.
 *
 * Models endpoint: https://huggingface.co/api/models?inference=warm&pipeline_tag=...
 * Inference:       https://api-inference.huggingface.co/models/{repo}
 */
import type {
  ProviderModule, AIModel, ImageGenInput, ImageGenResult, TextGenInput, TextGenResult, ProviderCreds,
} from './types';

interface HfModel { id: string; pipeline_tag?: string; downloads?: number; likes?: number }

export const huggingface: ProviderModule = {
  meta: {
    id: 'huggingface',
    name: 'Hugging Face',
    description: 'Open-source models. Free Inference API with hourly quota.',
    homepageUrl: 'https://huggingface.co/settings/tokens',
    keysHelp: 'Get a free Read token at huggingface.co/settings/tokens.',
    requiresKey: true,
    capabilities: { image: true, text: true },
    defaultModels: [
      { id: 'black-forest-labs/FLUX.1-schnell', label: 'FLUX.1 Schnell', kind: 'image', provider: 'huggingface', free: true },
      { id: 'stabilityai/stable-diffusion-xl-base-1.0', label: 'SDXL Base 1.0', kind: 'image', provider: 'huggingface', free: true },
      { id: 'stabilityai/sdxl-turbo', label: 'SDXL Turbo', kind: 'image', provider: 'huggingface', free: true },
      { id: 'meta-llama/Meta-Llama-3-8B-Instruct', label: 'Llama 3 8B Instruct', kind: 'text', provider: 'huggingface', free: true },
      { id: 'mistralai/Mistral-7B-Instruct-v0.3', label: 'Mistral 7B v0.3', kind: 'text', provider: 'huggingface', free: true },
      { id: 'HuggingFaceH4/zephyr-7b-beta', label: 'Zephyr 7B Beta', kind: 'text', provider: 'huggingface', free: true },
    ],
  },

  async listModels(creds?: ProviderCreds) {
    const headers: Record<string, string> = creds?.apiKey
      ? { Authorization: `Bearer ${creds.apiKey}` } : {};
    const out: AIModel[] = [];
    try {
      const imgRes = await fetch(
        'https://huggingface.co/api/models?inference=warm&pipeline_tag=text-to-image&sort=likes&limit=40',
        { headers }
      );
      if (imgRes.ok) {
        const data = (await imgRes.json()) as HfModel[];
        for (const m of data) {
          out.push({
            id: m.id, label: m.id.split('/').pop() || m.id,
            kind: 'image', provider: 'huggingface', free: true,
          });
        }
      }
      const txtRes = await fetch(
        'https://huggingface.co/api/models?inference=warm&pipeline_tag=text-generation&sort=likes&limit=40',
        { headers }
      );
      if (txtRes.ok) {
        const data = (await txtRes.json()) as HfModel[];
        for (const m of data) {
          out.push({
            id: m.id, label: m.id.split('/').pop() || m.id,
            kind: 'text', provider: 'huggingface', free: true,
          });
        }
      }
    } catch { /* ignore */ }
    return out.length > 0 ? out : (huggingface.meta.defaultModels ?? []);
  },

  async generateImage(input: ImageGenInput): Promise<ImageGenResult> {
    if (!input.apiKey) throw new Error('Hugging Face requires a token.');
    const model = input.model || 'black-forest-labs/FLUX.1-schnell';
    const seed = input.seed ?? Math.floor(Math.random() * 4294967295);
    const res = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'image/png',
      },
      body: JSON.stringify({
        inputs: input.prompt,
        parameters: {
          negative_prompt: input.negativePrompt,
          width: input.width, height: input.height, seed,
        },
      }),
    });
    if (!res.ok) throw new Error(`HF error ${res.status}: ${await res.text()}`);
    const ct = res.headers.get('content-type') || '';
    if (!ct.startsWith('image/')) {
      // model is loading/erroring
      throw new Error(`HF returned non-image (${ct}): ${await res.text()}`);
    }
    return { buffer: Buffer.from(await res.arrayBuffer()), model, seed, contentType: ct };
  },

  async generateText(input: TextGenInput): Promise<TextGenResult> {
    if (!input.apiKey) throw new Error('Hugging Face requires a token.');
    const model = input.model || 'mistralai/Mistral-7B-Instruct-v0.3';
    // HF's chat-completions endpoint mirrors OpenAI for instruct-tuned models
    const res = await fetch(`https://api-inference.huggingface.co/models/${model}/v1/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${input.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: input.messages,
        temperature: input.temperature ?? 0.7,
        max_tokens: input.maxTokens ?? 512,
      }),
    });
    if (!res.ok) throw new Error(`HF text error ${res.status}: ${await res.text()}`);
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return { text: json.choices?.[0]?.message?.content ?? '', model };
  },
};
