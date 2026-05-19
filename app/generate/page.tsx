import { connectDB, characters, prompts, plain, plainOne } from '@/lib/db/client';
import type { Character, Prompt } from '@/lib/db/schema';
import { PageHeader } from '@/components/shared/page-header';
import { GeneratePanel } from './generate-panel';

export const dynamic = 'force-dynamic';

export default async function GeneratePage() {
  await connectDB();
  const active = plainOne<Character>(await characters.findOne({ isActive: true }));
  const recentPrompts = active
    ? plain<Prompt>(await prompts.find({ characterId: active.id }).sort({ createdAt: -1 }).limit(8))
    : [];

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        eyebrow="Create"
        title="Generate image"
        description="Free generation via Cloudflare Workers AI + Pollinations fallback."
      />
      <GeneratePanel character={active ?? undefined} recentPrompts={recentPrompts} />
    </div>
  );
}
