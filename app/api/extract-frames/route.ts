import { NextRequest, NextResponse } from 'next/server';
import { extractFrames } from '@/lib/video/ffmpeg';
import { downloadVideo } from '@/lib/video/yt-dlp';
import { connectDB, extractedFrames, trends } from '@/lib/db/client';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const VIDEOS_DIR = path.join(process.cwd(), 'storage', 'videos');

/**
 * POST /api/extract-frames
 *
 * Two input modes:
 *  - JSON  { url, everySec?, maxFrames?, trendId? }   → downloads via yt-dlp
 *  - JSON  { videoPublicPath, everySec?, maxFrames?, trendId? } → reuse a
 *           video already saved on the server (e.g. a Trend's downloaded mp4)
 *  - multipart/form-data { file, everySec?, maxFrames? }  → user upload
 */
export async function POST(req: NextRequest) {
  try {
    const ct = req.headers.get('content-type') || '';
    let videoFilePath: string;          // absolute on-disk path used by ffmpeg
    let videoPublicPath: string;        // /storage/videos/... served URL
    let sourceUrl: string | undefined;
    let trendId: string | undefined;
    let everySec = 1;
    let maxFrames = 30;

    if (ct.includes('multipart/form-data')) {
      const fd = await req.formData();
      const file = fd.get('file') as File | null;
      if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });
      if (!fs.existsSync(VIDEOS_DIR)) fs.mkdirSync(VIDEOS_DIR, { recursive: true });
      const ext = path.extname(file.name).toLowerCase() || '.mp4';
      const fileName = `${Date.now()}_upload_${crypto.randomBytes(3).toString('hex')}${ext}`;
      videoFilePath = path.join(VIDEOS_DIR, fileName);
      fs.writeFileSync(videoFilePath, Buffer.from(await file.arrayBuffer()));
      videoPublicPath = `/storage/videos/${fileName}`;
      everySec = parseFloat((fd.get('everySec') as string) || '1');
      maxFrames = parseInt((fd.get('maxFrames') as string) || '30');
    } else {
      const body = await req.json();
      everySec = body.everySec ?? 1;
      maxFrames = body.maxFrames ?? 30;
      trendId = body.trendId;

      if (body.videoPublicPath) {
        // Reuse an already-downloaded video (e.g. a Trend's saved mp4)
        const rel = String(body.videoPublicPath).replace(/^\//, '');
        const candidate = path.join(process.cwd(), rel);
        if (!candidate.startsWith(path.join(process.cwd(), 'storage'))) {
          return NextResponse.json({ error: 'Invalid videoPublicPath' }, { status: 400 });
        }
        if (!fs.existsSync(candidate)) {
          return NextResponse.json({ error: 'Source video not found on disk' }, { status: 404 });
        }
        videoFilePath = candidate;
        videoPublicPath = body.videoPublicPath;
      } else if (body.url) {
        sourceUrl = body.url;
        const dl = await downloadVideo(body.url);
        videoFilePath = dl.filePath;
        videoPublicPath = dl.publicPath;
      } else {
        return NextResponse.json({ error: 'url, videoPublicPath, or file required' }, { status: 400 });
      }
    }

    // Sanity-clamp the user inputs
    everySec = Math.max(0.5, Math.min(10, Number.isFinite(everySec) ? everySec : 1));
    maxFrames = Math.max(1, Math.min(120, Number.isFinite(maxFrames) ? maxFrames : 30));

    const frames = await extractFrames({ videoPath: videoFilePath, everySec, maxFrames });

    if (frames.length === 0) {
      return NextResponse.json({
        error: 'No frames produced. Video may be too short or unreadable.',
      }, { status: 422 });
    }

    const batchId = `${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

    await connectDB();
    const saved = await Promise.all(frames.map((f) =>
      extractedFrames.create({
        sourceUrl,
        trendId,
        sourceVideoPath: videoFilePath,
        sourceVideoPublicPath: videoPublicPath,
        batchId,
        publicPath: f.publicPath,
        framePath: f.framePath,
        timestampSec: f.timestampSec,
      })
    ));

    // If this came from a Trend, link it back so the trend page shows the
    // extraction count without an extra query.
    if (trendId) {
      try { await trends.findByIdAndUpdate(trendId, { $set: { lastCheckedAt: new Date() } }); }
      catch { /* non-fatal */ }
    }

    return NextResponse.json({
      batchId,
      sourceVideoPublicPath: videoPublicPath,
      frames: frames.map((f, i) => ({
        ...f,
        id: saved[i].id,
        publicPath: f.publicPath,
        timestampSec: f.timestampSec,
      })),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('Frame extract error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * GET /api/extract-frames?batchId=...&trendId=...&limit=200
 * Lists previously extracted frames (so the UI history persists across reloads).
 */
export async function GET(req: NextRequest) {
  await connectDB();
  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '200'), 500);
  const filter: Record<string, unknown> = {};
  const batchId = url.searchParams.get('batchId');
  const trendId = url.searchParams.get('trendId');
  if (batchId) filter.batchId = batchId;
  if (trendId) filter.trendId = trendId;
  const rows = await extractedFrames.find(filter).sort({ createdAt: -1 }).limit(limit);
  return NextResponse.json({ frames: rows.map((r) => r.toJSON()) });
}
