/**
 * Pollinations.ai — completely free image generation, NO API key.
 * Used as fallback when Cloudflare quota is hit.
 * Quality: Lower than Flux but unlimited.
 */

export interface PollinationsInput {
  prompt: string;
  width?: number;
  height?: number;
  seed?: number;
  model?: 'flux' | 'turbo' | 'flux-realism' | 'flux-anime';
  enhance?: boolean;
  nologo?: boolean;
}

export async function generateImagePollinations(input: PollinationsInput): Promise<{
  buffer: Buffer;
  model: string;
  seed: number;
}> {
  const width = input.width ?? 1024;
  const height = input.height ?? 1024;
  const seed = input.seed ?? Math.floor(Math.random() * 4294967295);
  const model = input.model ?? 'flux';

  const params = new URLSearchParams({
    width: String(width),
    height: String(height),
    seed: String(seed),
    model,
    nologo: String(input.nologo ?? true),
    enhance: String(input.enhance ?? false),
  });

  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(input.prompt)}?${params}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Pollinations error ${res.status}`);
  }
  const arrayBuf = await res.arrayBuffer();
  return { buffer: Buffer.from(arrayBuf), model: `pollinations-${model}`, seed };
}
