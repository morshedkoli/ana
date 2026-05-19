import { connectDB, characters, prompts } from '@/lib/db/client';
import { PageHeader } from '@/components/shared/page-header';
import { GeneratePanel } from './generate-panel';

export const dynamic = 'force-dynamic';

export default async function GeneratePage() {
  await connectDB();
  const activeDoc = await characters.findOne({ isActive: true });
  const active = activeDoc?.toJSON() ?? null;

  const recentPrompts = active
    ? (await prompts.find({ characterId: active.id }).sort({ createdAt: -1 }).limit(8)).map(r => r.toJSON())
    : [];

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        eyebrow="Create"
        title="Generate image"
        description="Free generation via Cloudflare Workers AI + Pollinations fallback."
      />
      <GeneratePanel character={active} recentPrompts={recentPrompts} />
    </div>
  );
}
