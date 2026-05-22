import { NextRequest, NextResponse } from 'next/server';
import { connectDB, trends } from '@/lib/db/client';
import { downloadTrend } from '@/lib/video/yt-dlp';
import path from 'path';
import fs from 'fs';

/**
 * POST /api/trends/{id}/redownload
 * Re-runs the video + thumbnail download for an existing trend record.
 * Useful when the original save failed (yt-dlp not installed, network error,
 * URL temporarily blocked) or when the user wants a fresh copy.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await connectDB();
  const trend = await trends.findById(id);
  if (!trend) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Mark as downloading immediately so the UI can poll
  await trends.findByIdAndUpdate(id, {
    $set: { downloadStatus: 'downloading', downloadError: null },
  });

  // Fire-and-forget the actual download
  void (async () => {
    try {
      const result = await downloadTrend(trend.sourceUrl);
      // Clean up old files first
      unlinkPublic(trend.videoPath);
      unlinkPublic(trend.thumbnailPath);

      await connectDB();
      await trends.findByIdAndUpdate(id, {
        $set: {
          videoPath: result.videoPublicPath,
          videoBytes: result.bytes,
          thumbnailPath: result.thumbnailPublicPath ?? null,
          title: result.meta.title || trend.title,
          description: result.meta.description || trend.description,
          creator: result.meta.uploader || trend.creator,
          hashtags: result.meta.hashtags?.length ? result.meta.hashtags : trend.hashtags,
          viewCount: result.meta.viewCount || trend.viewCount,
          audioName: result.meta.audioName || trend.audioName,
          downloadStatus: 'ready',
          downloadError: null,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'unknown';
      console.error(`Redownload failed (${id}):`, message);
      try {
        await connectDB();
        await trends.findByIdAndUpdate(id, {
          $set: { downloadStatus: 'failed', downloadError: message.slice(0, 500) },
        });
      } catch { /* ignore */ }
    }
  })();

  return NextResponse.json({ ok: true, status: 'downloading' });
}

function unlinkPublic(publicPath?: string | null) {
  if (!publicPath || !publicPath.startsWith('/storage/')) return;
  const filePath = path.join(process.cwd(), publicPath.replace(/^\//, ''));
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch { /* non-fatal */ }
}
