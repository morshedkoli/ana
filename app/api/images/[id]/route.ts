import { NextRequest, NextResponse } from 'next/server';
import { connectDB, images } from '@/lib/db/client';
import fs from 'fs';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  await connectDB();
  await images.findByIdAndUpdate(id, {
    $set: {
      tags: body.tags,
      qualityScore: body.qualityScore,
      isFavorite: body.isFavorite,
      notes: body.notes,
    },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await connectDB();
  const img = await images.findById(id);
  if (img && fs.existsSync(img.filePath)) {
    try { fs.unlinkSync(img.filePath); } catch {}
  }
  await images.findByIdAndDelete(id);
  return NextResponse.json({ ok: true });
}
