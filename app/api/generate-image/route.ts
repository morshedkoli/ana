import { NextRequest, NextResponse } from 'next/server';
import { generateImage } from '@/lib/ai/generate';
import { connectDB, images, characters, prompts } from '@/lib/db/client';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      prompt, negativePrompt, provider = 'auto',
      cloudflareModel, pollinationsModel,
      width = 1024, height = 1024, seed,
      tags = [], savePrompt = true,
    } = body;

    if (!prompt || prompt.trim().length === 0) {
      return NextResponse.json({ error: 'Prompt required' }, { status: 400 });
    }

    const result = await generateImage({
      prompt, negativePrompt, provider, cloudflareModel, pollinationsModel,
      width, height, seed,
    });

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
      publicPath: result.publicPath,
      seed: result.seed,
      provider: result.provider,
      model: result.model,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('Image gen error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
