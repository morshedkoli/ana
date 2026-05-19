import { NextRequest, NextResponse } from 'next/server';
import { connectDB, trends } from '@/lib/db/client';
import { fetchVideoMeta, downloadThumbnail } from '@/lib/video/yt-dlp';

export async function GET() {
  await connectDB();
  const rows = await trends.find().sort({ savedAt: -1 });
  return NextResponse.json(rows.map(r => r.toJSON()));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, category, notes } = body;
    if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 });

    let meta;
    let thumbnailPath: string | undefined;
    try {
      meta = await fetchVideoMeta(url);
      try { thumbnailPath = await downloadThumbnail(url); } catch {}
    } catch {
      const platform = /tiktok/.test(url) ? 'tiktok' :
                       /youtube|youtu\.be/.test(url) ? 'youtube' :
                       /instagram/.test(url) ? 'instagram' : 'unknown';
      meta = { id: '', url, platform, title: '', description: '', uploader: '',
        uploadDate: '', duration: 0, likeCount: 0, thumbnail: '',
        viewCount: 0, hashtags: [], audioName: undefined, raw: {} } as Awaited<ReturnType<typeof fetchVideoMeta>>;
    }

    await connectDB();
    const inserted = await trends.create({
      sourceUrl: meta.url,
      platform: meta.platform,
      title: meta.title,
      description: meta.description,
      thumbnailPath,
      creator: meta.uploader,
      hashtags: meta.hashtags,
      category: category || 'other',
      viewCount: meta.viewCount,
      audioName: meta.audioName,
      notes,
    });

    return NextResponse.json(inserted.toJSON());
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
