import { NextRequest, NextResponse } from 'next/server';
import { connectDB, extractedFrames } from '@/lib/db/client';
import fs from 'fs';

/**
 * DELETE /api/extract-frames/{id}
 * Removes a single extracted frame and its on-disk file.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await connectDB();
  const frame = await extractedFrames.findById(id);
  if (frame?.framePath && fs.existsSync(frame.framePath)) {
    try { fs.unlinkSync(frame.framePath); } catch { /* ignore */ }
  }
  await extractedFrames.findByIdAndDelete(id);
  return NextResponse.json({ ok: true });
}
