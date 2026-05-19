/**
 * Cloudflare Workers AI client.
 * Free tier: ~10,000 neurons/day. Flux Schnell ≈ 50-100 free images/day.
 *
 * Setup:
 * 1. Create a free Cloudflare account
 * 2. Dashboard → AI → Workers AI → grab Account ID
 * 3. Create API token: My Profile → API Tokens → "Workers AI" template
 * 4. Save both in /settings page of the app
 */

import { db } from '@/lib/db/client';
import { settings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export type CloudflareModel =
  | '@cf/black-forest-labs/flux-1-schnell'
  | '@cf/stabilityai/stable-diffusion-xl-base-1.0'
  | '@cf/lykon/dreamshaper-8-lcm'
  | '@cf/bytedance/stable-diffusion-xl-lightning';

export interface CloudflareImageInput {
  prompt: string;
  model?: CloudflareModel;
  negativePrompt?: string;
  width?: number;
  height?: number;
  numSteps?: number;
  seed?: number;
  guidance?: number;
  // Optional image-to-image
  imageBase64?: string;
}

async function getCfCredentials() {
  const rows = await db.select().from(settings).where(eq(settings.key, 'cloudflare_account_id'));
  const tokenRows = await db.select().from(settings).where(eq(settings.key, 'cloudflare_api_token'));
  const accountId = (rows[0]?.value as string) || process.env.CLOUDFLARE_ACCOUNT_ID || '';
  const token = (tokenRows[0]?.value as string) || process.env.CLOUDFLARE_API_TOKEN || '';
  if (!accountId || !token) {
    throw new Error('Cloudflare credentials missing. Add them in /settings.');
  }
  return { accountId, token };
}

/**
 * Generate an image via Cloudflare Workers AI.
 * Returns a Buffer of the PNG/JPEG bytes.
 */
export async function generateImageCloudflare(input: CloudflareImageInput): Promise<{
  buffer: Buffer;
  model: string;
  seed: number;
}> {
  const { accountId, token } = await getCfCredentials();
  const model = input.model || '@cf/black-forest-labs/flux-1-schnell';
  const seed = input.seed ?? Math.floor(Math.random() * 4294967295);

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;

  const body: Record<string, unknown> = {
    prompt: input.prompt,
    num_steps: input.numSteps ?? 4, // Flux Schnell is fast at 4 steps
    seed,
  };

  if (input.negativePrompt && !model.includes('flux')) {
    body.negative_prompt = input.negativePrompt;
  }
  if (input.width) body.width = input.width;
  if (input.height) body.height = input.height;
  if (input.guidance) body.guidance = input.guidance;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cloudflare AI error ${res.status}: ${text}`);
  }

  const contentType = res.headers.get('content-type') || '';

  // Flux returns JSON with base64
  if (contentType.includes('application/json')) {
    const json: { result?: { image?: string } } = await res.json();
    const b64 = json?.result?.image;
    if (!b64) throw new Error('Cloudflare returned no image');
    return { buffer: Buffer.from(b64, 'base64'), model, seed };
  }

  // SDXL returns raw image bytes
  const arrayBuf = await res.arrayBuffer();
  return { buffer: Buffer.from(arrayBuf), model, seed };
}
