import { NextRequest, NextResponse } from 'next/server';
import { connectDB, trends } from '@/lib/db/client';
import path from 'path';
import fs from 'fs';

/**
 * GET /api/trends/{id} — read a single trend.
 * Used by the UI to poll for the background download to complete.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await connectDB();
  const t = await trends.findById(id);
  if (!t) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(t.toJSON());
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  await connectDB();
  await trends.findByIdAndUpdate(id, { $set: body });
  return NextResponse.json({ ok: true });
}

/**
 * DELETE /api/trends/{id} — remove a trend and its locally-saved files
 * (video + thumbnail), leaving the original source URL untouched.
 */
export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await connectDB();
  const trend = await trends.findById(id);
  if (trend) {
    unlinkPublic(trend.videoPath);
    unlinkPublic(trend.thumbnailPath);
    await trends.findByIdAndDelete(id);
  }
  return NextResponse.json({ ok: true });
}

function unlinkPublic(publicPath?: string | null) {
  if (!publicPath || !publicPath.startsWith('/storage/')) return;
  const filePath = path.join(process.cwd(), publicPath.replace(/^\//, ''));
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch { /* non-fatal */ }
}
