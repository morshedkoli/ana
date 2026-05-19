import { connectDB, characters, images, plainOne, plain } from '@/lib/db/client';
import type { Character, Image } from '@/lib/db/schema';
import { PageHeader } from '@/components/shared/page-header';
import { CharacterEditor } from './character-editor';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function CharacterPage() {
  await connectDB();

  let activeDoc = await characters.findOne({ isActive: true });
  if (!activeDoc) activeDoc = await characters.findOne();
  if (!activeDoc) redirect('/');

  const active = plainOne<Character>(activeDoc)!;
  const imgs = plain<Image>(
    await images.find({ characterId: active.id }).sort({ createdAt: -1 }).limit(12)
  );

  return (
    <div className="space-y-10 animate-fade-in">
      <PageHeader
        eyebrow="Identity"
        title="Character vault"
        description="Lock who she is — persona, voice, look. Every video draws from here."
      />
      <CharacterEditor character={active} recentImages={imgs} />
    </div>
  );
}
