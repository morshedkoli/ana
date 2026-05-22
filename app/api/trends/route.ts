import { NextRequest, NextResponse } from 'next/server';
import { connectDB, trends } from '@/lib/db/client';
import { fetchVideoMeta, downloadTrend } from '@/lib/video/yt-dlp';

/**
 * GET /api/trends — list all saved trends, newest first.
 */
export async function GET() {
  await connectDB();
  const rows = await trends.find().sort({ savedAt: -1 });
  return NextResponse.json(rows.map((r) => r.toJSON()));
}

/**
 * POST /api/trends
 * Body: { url, category?, notes?, download?: boolean (default true) }
 *
 * Flow:
 *  1. Insert a record immediately with status="pending" and any metadata we
 *     can fetch quickly. The user gets a fast response.
 *  2. Kick off the full video + thumbnail download in the background, then
 *     update the record with the local paths and status="ready".
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, category, notes, download = true } = body;
    if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 });

    // Try fast-path metadata so the saved record has a title/thumbnail right away.
    // If yt-dlp isn't installed or the URL fails, we still create a record with
    // the user's URL and let the background job try harder.
    let meta;
    try {
      meta = await fetchVideoMeta(url);
    } catch (err) {
      meta = {
        id: '', url,
        platform: detectPlatform(url),
        title: '', description: '', uploader: '',
        uploadDate: '', duration: 0, likeCount: 0, thumbnail: '',
        viewCount: 0, hashtags: [], audioName: undefined, raw: {},
      };
      console.warn('Fast metadata fetch failed:', err);
    }

    await connectDB();
    const inserted = await trends.create({
      sourceUrl: meta.url || url,
      platform: meta.platform,
      title: meta.title,
      description: meta.description,
      creator: meta.uploader,
      hashtags: meta.hashtags,
      category: category || 'other',
      viewCount: meta.viewCount,
      audioName: meta.audioName,
      notes,
      downloadStatus: download ? 'downloading' : 'skipped',
    });

    if (download) {
      // Fire-and-forget — don't block the response on the actual download.
      void runBackgroundDownload(String(inserted.id), url);
    }

    return NextResponse.json(inserted.toJSON());
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function detectPlatform(url: string): string {
  if (/tiktok\.com/.test(url)) return 'tiktok';
  if (/youtube\.com|youtu\.be/.test(url)) return 'youtube';
  if (/instagram\.com/.test(url)) return 'instagram';
  if (/twitter\.com|x\.com/.test(url)) return 'twitter';
  if (/facebook\.com|fb\.watch/.test(url)) return 'facebook';
  return 'unknown';
}

async function runBackgroundDownload(trendId: string, url: string): Promise<void> {
  try {
    await connectDB();
    const result = await downloadTrend(url);
    await trends.findByIdAndUpdate(trendId, {
      $set: {
        videoPath: result.videoPublicPath,
        videoBytes: result.bytes,
        thumbnailPath: result.thumbnailPublicPath ?? null,
        // Refresh metadata in case the fast-path failed earlier
        title: result.meta.title || undefined,
        description: result.meta.description || undefined,
        creator: result.meta.uploader || undefined,
        hashtags: result.meta.hashtags?.length ? result.meta.hashtags : undefined,
        viewCount: result.meta.viewCount || undefined,
        audioName: result.meta.audioName || undefined,
        downloadStatus: 'ready',
        downloadError: null,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    console.error(`Trend download failed (${trendId}):`, message);
    try {
      await connectDB();
      await trends.findByIdAndUpdate(trendId, {
        $set: { downloadStatus: 'failed', downloadError: message.slice(0, 500) },
      });
    } catch { /* ignore */ }
  }
}
