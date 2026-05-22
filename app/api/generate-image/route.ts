import { NextRequest, NextResponse } from 'next/server';
import { generateImage } from '@/lib/ai/generate';
import { connectDB, images, characters, prompts } from '@/lib/db/client';
import { uploadToHost, HOSTS } from '@/lib/hosting/registry';
import type { HostingProviderId } from '@/lib/hosting/types';
import fs from 'fs';
import path from 'path';

/**
 * POST /api/generate-image
 * Body: { prompt, provider?, model?, width?, height?, seed?, negativePrompt?,
 *         tags?, savePrompt?, cloudflareModel?, pollinationsModel?,
 *         host?: HostingProviderId  // optional cloud-mirror after generation
 *       }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      prompt, negativePrompt, provider = 'auto', model,
      cloudflareModel, pollinationsModel,
      width = 1024, height = 1024, seed,
      tags = [], savePrompt = true,
      host,
    } = body;

    if (!prompt || prompt.trim().length === 0) {
      return NextResponse.json({ error: 'Prompt required' }, { status: 400 });
    }

    const result = await generateImage({
      prompt, negativePrompt, provider, model,
      cloudflareModel, pollinationsModel,
      width, height, seed,
    });

    // Optional: mirror to a remote host
    let remote: { provider: HostingProviderId; url: string; remoteId?: string; deleteUrl?: string; bytes?: number } | null = null;
    if (host && host !== 'local' && Object.keys(HOSTS).includes(host)) {
      try {
        const buf = fs.readFileSync(result.filePath);
        const up = await uploadToHost(host as HostingProviderId, {
          buffer: buf,
          filename: path.basename(result.filePath),
          contentType: 'image/png',
        });
        remote = {
          provider: host as HostingProviderId,
          url: up.url, remoteId: up.remoteId, deleteUrl: up.deleteUrl, bytes: up.bytes,
        };
      } catch (err) {
        console.warn('Remote mirror failed:', err);
      }
    }

    await connectDB();
    const active = await characters.findOne({ isActive: true });

    const inserted = await images.create({
      characterId: active?.id ?? null,
      filePath: result.filePath,
      prompt,
      negativePrompt,
      seed: result.seed,
      source: result.provider,
      model: result.model,
      width, height,
      tags,
      hostProvider: remote ? remote.provider : 'local',
      remoteUrl: remote?.url ?? null,
      remoteId: remote?.remoteId ?? null,
      remoteDeleteUrl: remote?.deleteUrl ?? null,
      remoteBytes: remote?.bytes ?? null,
    });

    if (savePrompt) {
      await prompts.create({
        characterId: active?.id ?? null,
        promptText: prompt,
        negativePrompt,
        seed: result.seed,
        resultImageId: inserted.id,
      });
    }

    return NextResponse.json({
      id: inserted.id,
      publicPath: remote?.url || result.publicPath,
      seed: result.seed,
      provider: result.provider,
      model: result.model,
      hostProvider: remote ? remote.provider : 'local',
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('Image gen error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
