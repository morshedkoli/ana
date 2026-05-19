import { NextRequest, NextResponse } from 'next/server';
import { connectDB, extractedFrames, images, characters } from '@/lib/db/client';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const IMAGES_DIR = path.join(process.cwd(), 'storage', 'images');

export async function POST(req: NextRequest) {
  try {
    const { frameId, tags = [], referenceType } = await req.json();
    await connectDB();
    const frame = await extractedFrames.findById(frameId);
    if (!frame) return NextResponse.json({ error: 'Frame not found' }, { status: 404 });

    if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });
    const ext = path.extname(frame.framePath) || '.jpg';
    const fileName = `${Date.now()}_frame_${crypto.randomBytes(3).toString('hex')}${ext}`;
    const newPath = path.join(IMAGES_DIR, fileName);
    fs.copyFileSync(frame.framePath, newPath);

    const active = await characters.findOne({ isActive: true });
    await images.create({
      characterId: active?.id ?? null,
      filePath: newPath,
      source: 'extracted',
      tags: [...tags, referenceType].filter(Boolean) as string[],
      notes: `Extracted from ${frame.sourceUrl || 'upload'} @ ${frame.timestampSec}s`,
    });

    await extractedFrames.findByIdAndUpdate(frameId, {
      $set: { savedToLibrary: true, referenceType, tags },
    });

    return NextResponse.json({ ok: true, publicPath: `/storage/images/${fileName}` });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
