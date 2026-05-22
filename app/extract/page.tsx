import { connectDB, extractedFrames, trends, plain } from '@/lib/db/client';
import type { ExtractedFrame, Trend } from '@/lib/db/schema';
import { PageHeader } from '@/components/shared/page-header';
import { FrameExtractor } from './frame-extractor';

export const dynamic = 'force-dynamic';

export default async function ExtractPage() {
  await connectDB();

  const [recentFrames, downloadedTrends] = await Promise.all([
    plain<ExtractedFrame>(
      await extractedFrames.find().sort({ createdAt: -1 }).limit(120)
    ),
    plain<Trend>(
      await trends.find({ videoPath: { $ne: null }, downloadStatus: 'ready' })
        .sort({ savedAt: -1 }).limit(20)
    ),
  ]);

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        eyebrow="Extract"
        title="Frame extractor"
        description="Pull reference frames from videos to build your style, pose, and expression library."
      />
      <FrameExtractor
        initialFrames={recentFrames}
        downloadedTrends={downloadedTrends}
      />
    </div>
  );
}
