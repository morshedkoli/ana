import { connectDB, trends, plain } from '@/lib/db/client';
import type { Trend } from '@/lib/db/schema';
import { PageHeader } from '@/components/shared/page-header';
import { TrendsBoard } from './trends-board';
import { getYtDlpStatus } from '@/lib/video/yt-dlp-binary';

export const dynamic = 'force-dynamic';

export default async function TrendsPage() {
  await connectDB();
  const rows = plain<Trend>(await trends.find().sort({ savedAt: -1 }));
  const ytDlp = await getYtDlpStatus();

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        eyebrow="Inspiration"
        title="Trend tracker"
        description="Paste a TikTok / YouTube / Reels URL — we save metadata and download the video + thumbnail to local storage."
      />
      <TrendsBoard trends={rows} initialBinary={ytDlp} />
    </div>
  );
}
