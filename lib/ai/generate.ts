import { generateImageCloudflare, type CloudflareImageInput, type CloudflareModel } from './cloudflare';
import { generateImagePollinations, type PollinationsInput } from './pollinations';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export type ImageProvider = 'cloudflare' | 'pollinations' | 'auto';

export interface GenerateOptions {
  prompt: string;
  provider?: ImageProvider;
  cloudflareModel?: CloudflareModel;
  pollinationsModel?: PollinationsInput['model'];
  negativePrompt?: string;
  width?: number;
  height?: number;
  seed?: number;
  referenceImageBase64?: string;
}

export interface GenerateResult {
  filePath: string;
  fileName: string;
  publicPath: string;
  provider: 'cloudflare' | 'pollinations';
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

export async function generateImage(opts: GenerateOptions): Promise<GenerateResult> {
  ensureDir();
  const provider = opts.provider ?? 'auto';

  let result: { buffer: Buffer; model: string; seed: number };
  let actualProvider: 'cloudflare' | 'pollinations';

  if (provider === 'pollinations') {
    result = await generateImagePollinations({
      prompt: opts.prompt,
      width: opts.width,
      height: opts.height,
      seed: opts.seed,
      model: opts.pollinationsModel,
    });
    actualProvider = 'pollinations';
  } else if (provider === 'cloudflare') {
    result = await generateImageCloudflare({
      prompt: opts.prompt,
      model: opts.cloudflareModel,
      negativePrompt: opts.negativePrompt,
      width: opts.width,
      height: opts.height,
      seed: opts.seed,
    });
    actualProvider = 'cloudflare';
  } else {
    // auto: Cloudflare first, fallback to Pollinations
    try {
      result = await generateImageCloudflare({
        prompt: opts.prompt,
        model: opts.cloudflareModel,
        negativePrompt: opts.negativePrompt,
        width: opts.width,
        height: opts.height,
        seed: opts.seed,
      });
      actualProvider = 'cloudflare';
    } catch (err) {
      console.warn('Cloudflare failed, falling back to Pollinations:', err);
      result = await generateImagePollinations({
        prompt: opts.prompt,
        width: opts.width,
        height: opts.height,
        seed: opts.seed,
        model: opts.pollinationsModel,
      });
      actualProvider = 'pollinations';
    }
  }

  const fileName = buildFilename(result.seed, actualProvider);
  const filePath = path.join(IMAGES_DIR, fileName);
  fs.writeFileSync(filePath, result.buffer);

  return {
    filePath,
    fileName,
    publicPath: `/storage/images/${fileName}`,
    provider: actualProvider,
    model: result.model,
    seed: result.seed,
    bytes: result.buffer.length,
  };
}
