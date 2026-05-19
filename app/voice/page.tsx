import { connectDB, audioClips, characters, plain, plainOne } from '@/lib/db/client';
import type { AudioClip, Character } from '@/lib/db/schema';
import { PageHeader } from '@/components/shared/page-header';
import { VoiceLab } from './voice-lab';

export const dynamic = 'force-dynamic';

export default async function VoicePage() {
  await connectDB();
  const active = plainOne<Character>(await characters.findOne({ isActive: true }));
  const recent = plain<AudioClip>(await audioClips.find().sort({ createdAt: -1 }).limit(30));

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        eyebrow="Voice"
        title="Voice lab"
        description="Generate unlimited free Bangla voice via Edge TTS."
      />
      <VoiceLab character={active ?? undefined} recent={recent} />
    </div>
  );
}
