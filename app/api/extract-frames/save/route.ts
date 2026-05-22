import { NextRequest, NextResponse } from 'next/server';
import { connectDB, extractedFrames, images, characters } from '@/lib/db/client';
import { uploadToHost, getDefaultHost, HOSTS } from '@/lib/hosting/registry';
import type { HostingProviderId } from '@/lib/hosting/types';
import fs from 'fs';
import path from 'path';

/**
 * POST /api/extract-frames/save
 * Accepts either a single frame or an array of frames and saves them into
 * the image library through the user's selected image host.
 *
 * Body: {
 *   frameIds?: string[]   // bulk
 *   frameId?: string      // single (back-compat)
 *   referenceType?: string
 *   tags?: string[]
 *   host?: HostingProviderId  // overrides default
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const ids: string[] = Array.isArray(body.frameIds)
      ? body.frameIds
      : body.frameId ? [body.frameId] : [];
    if (ids.length === 0) {
      return NextResponse.json({ error: 'frameIds required' }, { status: 400 });
    }

    const referenceType: string | undefined = body.referenceType;
    const tags: string[] = Array.isArray(body.tags) ? body.tags : [];

    let host: HostingProviderId;
    if (body.host && Object.keys(HOSTS).includes(body.host)) {
      host = body.host as HostingProviderId;
    } else {
      host = await getDefaultHost();
    }

    await connectDB();
    const active = await characters.findOne({ isActive: true });
    const results: Array<{ frameId: string; imageId?: string; publicPath?: string; error?: string }> = [];

    for (const id of ids) {
      try {
        const frame = await extractedFrames.findById(id);
        if (!frame) { results.push({ frameId: id, error: 'Frame not found' }); continue; }
        if (!fs.existsSync(frame.framePath)) {
          results.push({ frameId: id, error: 'Frame file missing on disk' });
          continue;
        }

        const buffer = fs.readFileSync(frame.framePath);
        const filename = path.basename(frame.framePath);

        const upload = await uploadToHost(host, {
          buffer, filename, contentType: 'image/jpeg',
        });

        const isLocal = host === 'local';
        const inserted = await images.create({
          characterId: active?.id ?? null,
          // For local uploads keep the on-disk path; for remote, point at the URL
          filePath: isLocal ? upload.remoteId || upload.url : upload.url,
          source: 'extracted',
          tags: [...new Set([...tags, referenceType].filter(Boolean) as string[])],
          notes: `Extracted from ${frame.sourceUrl || frame.sourceVideoPath || 'upload'} @ ${(frame.timestampSec || 0).toFixed(1)}s`,
          hostProvider: host,
          remoteUrl: isLocal ? null : upload.url,
          remoteId: upload.remoteId ?? null,
          remoteDeleteUrl: upload.deleteUrl ?? null,
          remoteBytes: upload.bytes ?? null,
        });

        await extractedFrames.findByIdAndUpdate(id, {
          $set: {
            savedToLibrary: true,
            referenceType,
            tags: [...(frame.tags || []), ...tags].filter((v, i, a) => a.indexOf(v) === i),
          },
        });

        results.push({
          frameId: id,
          imageId: inserted.id,
          publicPath: isLocal ? frame.publicPath || `/storage/images/${path.basename(upload.remoteId || upload.url)}` : upload.url,
        });
      } catch (err) {
        results.push({ frameId: id, error: err instanceof Error ? err.message : 'Failed' });
      }
    }

    return NextResponse.json({
      ok: results.every((r) => !r.error),
      hostProvider: host,
      saved: results.filter((r) => !r.error).length,
      failed: results.filter((r) => r.error).length,
      results,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
