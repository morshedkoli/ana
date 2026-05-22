import { NextRequest, NextResponse } from 'next/server';
import { connectDB, images, characters } from '@/lib/db/client';
import path from 'path';
import { uploadToHost, getDefaultHost, HOSTS } from '@/lib/hosting/registry';
import type { HostingProviderId } from '@/lib/hosting/types';

/**
 * POST /api/images
 * Form fields:
 *  - file       (required) image file
 *  - tags       comma-separated tags
 *  - notes      optional notes
 *  - host       optional host id; defaults to user-selected default
 *
 * Uploads bytes to the chosen host (local | cloudinary | imgbb | imgur | catbox)
 * and persists the resulting image record with both the local-style filePath
 * and any cloud-host metadata.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const tagsRaw = (formData.get('tags') as string) || '';
    const notes = (formData.get('notes') as string) || '';
    const requestedHost = formData.get('host') as string | null;

    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

    let host: HostingProviderId;
    if (requestedHost && Object.keys(HOSTS).includes(requestedHost)) {
      host = requestedHost as HostingProviderId;
    } else {
      host = await getDefaultHost();
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = file.name || `upload_${Date.now()}.png`;

    const upload = await uploadToHost(host, {
      buffer, filename, contentType: file.type || 'image/png',
    });

    await connectDB();
    const active = await characters.findOne({ isActive: true });
    const tags = tagsRaw.split(',').map((s) => s.trim()).filter(Boolean);

    const isLocal = host === 'local';
    const meta = (upload.metadata || {}) as { width?: number; height?: number };

    const inserted = await images.create({
      characterId: active?.id ?? null,
      // For local uploads, filePath is the absolute on-disk path (legacy contract).
      // For remote uploads, store the remote URL so the file is reachable directly.
      filePath: isLocal ? (upload.remoteId || upload.url) : upload.url,
      source: 'upload',
      tags, notes,
      width: meta.width ?? null,
      height: meta.height ?? null,
      hostProvider: host,
      remoteUrl: isLocal ? null : upload.url,
      remoteId: upload.remoteId ?? null,
      remoteDeleteUrl: upload.deleteUrl ?? null,
      remoteBytes: upload.bytes ?? null,
    });

    return NextResponse.json({
      id: inserted.id,
      // Public path the frontend can use directly
      publicPath: isLocal
        ? `/storage/images/${path.basename(upload.remoteId || upload.url)}`
        : upload.url,
      hostProvider: host,
      remoteUrl: upload.url,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET() {
  await connectDB();
  const rows = await images.find().sort({ createdAt: 1 });
  return NextResponse.json(rows.map((r) => r.toJSON()));
}
