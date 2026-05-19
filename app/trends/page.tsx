import { connectDB, trends } from '@/lib/db/client';
import { PageHeader } from '@/components/shared/page-header';
import { TrendsBoard } from './trends-board';

export const dynamic = 'force-dynamic';

export default async function TrendsPage() {
  await connectDB();
  const rows = (await trends.find().sort({ savedAt: -1 })).map(r => r.toJSON());
  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        eyebrow="Inspiration"
        title="Trend tracker"
        description="Paste TikTok / YouTube / Reels URLs to save trends with auto-fetched metadata."
      />
      <TrendsBoard trends={rows} />
    </div>
  );
}
