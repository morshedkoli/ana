import { NextRequest, NextResponse } from 'next/server';
import { extractFrames } from '@/lib/video/ffmpeg';
import { downloadVideo } from '@/lib/video/yt-dlp';
import { connectDB, extractedFrames } from '@/lib/db/client';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const VIDEOS_DIR = path.join(process.cwd(), 'storage', 'videos');

export async function POST(req: NextRequest) {
  try {
    const ct = req.headers.get('content-type') || '';
    let videoPath: string;
    let sourceUrl: string | undefined;
    let everySec = 1;
    let maxFrames = 30;

    if (ct.includes('multipart/form-data')) {
      const fd = await req.formData();
      const file = fd.get('file') as File | null;
      if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });
      if (!fs.existsSync(VIDEOS_DIR)) fs.mkdirSync(VIDEOS_DIR, { recursive: true });
      const ext = path.extname(file.name) || '.mp4';
      const fileName = `${Date.now()}_${crypto.randomBytes(3).toString('hex')}${ext}`;
      videoPath = path.join(VIDEOS_DIR, fileName);
      fs.writeFileSync(videoPath, Buffer.from(await file.arrayBuffer()));
      everySec = parseFloat((fd.get('everySec') as string) || '1');
      maxFrames = parseInt((fd.get('maxFrames') as string) || '30');
    } else {
      const body = await req.json();
      sourceUrl = body.url;
      everySec = body.everySec ?? 1;
      maxFrames = body.maxFrames ?? 30;
      if (!sourceUrl) return NextResponse.json({ error: 'URL required' }, { status: 400 });
      videoPath = await downloadVideo(sourceUrl);
    }

    const frames = await extractFrames({ videoPath, everySec, maxFrames });

    await connectDB();
    const saved = await Promise.all(frames.map(f =>
      extractedFrames.create({
        sourceUrl, sourceVideoPath: videoPath,
        framePath: f.framePath,
        timestampSec: f.timestampSec,
      })
    ));

    return NextResponse.json({
      frames: frames.map((f, i) => ({ ...f, id: saved[i].id })),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('Frame extract error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
