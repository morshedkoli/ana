import { connectDB, audioClips, characters } from '@/lib/db/client';
import { PageHeader } from '@/components/shared/page-header';
import { VoiceLab } from './voice-lab';

export const dynamic = 'force-dynamic';

export default async function VoicePage() {
  await connectDB();
  const activeDoc = await characters.findOne({ isActive: true });
  const recent = (await audioClips.find().sort({ createdAt: -1 }).limit(30)).map(r => r.toJSON());

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        eyebrow="Voice"
        title="Voice lab"
        description="Generate unlimited free Bangla voice via Edge TTS."
      />
      <VoiceLab character={activeDoc?.toJSON() ?? null} recent={recent} />
    </div>
  );
}
