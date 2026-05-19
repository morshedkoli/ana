import { NextRequest, NextResponse } from 'next/server';
import { connectDB, images, characters } from '@/lib/db/client';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const IMAGES_DIR = path.join(process.cwd(), 'storage', 'images');

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const tagsRaw = (formData.get('tags') as string) || '';
    const notes = (formData.get('notes') as string) || '';

    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

    if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });
    const ext = path.extname(file.name) || '.png';
    const fileName = `${Date.now()}_upload_${crypto.randomBytes(3).toString('hex')}${ext}`;
    const filePath = path.join(IMAGES_DIR, fileName);

    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    await connectDB();
    const active = await characters.findOne({ isActive: true });

    const tags = tagsRaw.split(',').map(s => s.trim()).filter(Boolean);
    const inserted = await images.create({
      characterId: active?.id ?? null,
      filePath, source: 'upload', tags, notes,
    });

    return NextResponse.json({
      id: inserted.id,
      publicPath: `/storage/images/${fileName}`,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET() {
  await connectDB();
  const rows = await images.find().sort({ createdAt: 1 });
  return NextResponse.json(rows.map(r => r.toJSON()));
}
