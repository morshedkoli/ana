import { NextRequest, NextResponse } from 'next/server';
import { connectDB, images } from '@/lib/db/client';
import { deleteFromHost, HOSTS } from '@/lib/hosting/registry';
import type { HostingProviderId } from '@/lib/hosting/types';
import fs from 'fs';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await connectDB();
  const img = await images.findById(id);
  if (img) {
    // Best-effort remote delete first (non-fatal)
    if (img.hostProvider && Object.keys(HOSTS).includes(img.hostProvider) && img.hostProvider !== 'local') {
      try {
        await deleteFromHost(
          img.hostProvider as HostingProviderId,
          img.remoteId || '',
          img.remoteDeleteUrl || undefined
        );
      } catch (err) {
        console.warn('Remote delete failed (continuing):', err);
      }
    }
    // Local fallback delete
    if (img.filePath && !img.filePath.startsWith('http') && fs.existsSync(img.filePath)) {
      try { fs.unlinkSync(img.filePath); } catch { /* ignore */ }
    }
  }
  await images.findByIdAndDelete(id);
  return NextResponse.json({ ok: true });
}
