/**
 * High-level image generation: dispatches to the multi-provider registry,
 * persists the resulting bytes to /storage/images, and returns the public path.
 *
 * Supports any provider registered in lib/ai/providers/registry.ts. When the
 * provider is "auto" (or omitted), tries each capable provider in order until
 * one succeeds.
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  generateImageWith, listProviderMetas, isProviderConfigured,
} from './providers/registry';
import type { ProviderId } from './providers/types';

export type ImageProvider = ProviderId | 'auto';

export interface GenerateOptions {
  prompt: string;
  provider?: ImageProvider;
  /** Generic model id (provider-specific). */
  model?: string;
  /** Legacy: cloudflare-specific model. Folded into `model` if `provider==="cloudflare"`. */
  cloudflareModel?: string;
  /** Legacy: pollinations-specific model. Folded into `model` if `provider==="pollinations"`. */
  pollinationsModel?: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  seed?: number;
}

export interface GenerateResult {
  filePath: string;
  fileName: string;
  publicPath: string;
  provider: ProviderId;
  model: string;
  seed: number;
  bytes: number;
}

const IMAGES_DIR = path.join(process.cwd(), 'storage', 'images');

function ensureDir() {
  if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

function buildFilename(seed: number, provider: string): string {
  const ts = Date.now();
  const rand = crypto.randomBytes(3).toString('hex');
  return `${ts}_${provider}_${seed}_${rand}.png`;
}

/** Auto-resolution order: keyless first, then keyed providers that are configured. */
async function autoOrder(): Promise<ProviderId[]> {
  const order: ProviderId[] = [];
  const metas = listProviderMetas().filter((m) => m.capabilities.image);
  // Pollinations first (free, keyless)
  metas.sort((a, b) => Number(a.requiresKey) - Number(b.requiresKey));
  for (const m of metas) {
    if (await isProviderConfigured(m.id)) order.push(m.id);
  }
  return order;
}

export async function generateImage(opts: GenerateOptions): Promise<GenerateResult> {
  ensureDir();

  const requested: ImageProvider = opts.provider ?? 'auto';
  const tryOrder: ProviderId[] = requested === 'auto'
    ? await autoOrder()
    : [requested];

  if (tryOrder.length === 0) {
    throw new Error('No image providers configured. Add a key in /studio.');
  }

  // Resolve effective model from legacy fields if needed
  const resolveModel = (provider: ProviderId): string | undefined => {
    if (opts.model) return opts.model;
    if (provider === 'cloudflare') return opts.cloudflareModel;
    if (provider === 'pollinations') return opts.pollinationsModel;
    return undefined;
  };

  let lastErr: unknown;
  for (const p of tryOrder) {
    try {
      const result = await generateImageWith(p, {
        prompt: opts.prompt, model: resolveModel(p),
        width: opts.width, height: opts.height, seed: opts.seed,
        negativePrompt: opts.negativePrompt,
      });
      const fileName = buildFilename(result.seed, p);
      const filePath = path.join(IMAGES_DIR, fileName);
      fs.writeFileSync(filePath, result.buffer);
      return {
        filePath, fileName,
        publicPath: `/storage/images/${fileName}`,
        provider: p, model: result.model, seed: result.seed,
        bytes: result.buffer.length,
      };
    } catch (err) {
      lastErr = err;
      console.warn(`Provider ${p} failed, trying next:`, err);
    }
  }
  throw new Error(
    lastErr instanceof Error
      ? `All providers failed. Last error: ${lastErr.message}`
      : 'All providers failed'
  );
}
