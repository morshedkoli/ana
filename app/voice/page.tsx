import { connectDB, audioClips, characters, plain, plainOne } from '@/lib/db/client';
import type { AudioClip, Character } from '@/lib/db/schema';
import { PageHeader } from '@/components/shared/page-header';
import { VoiceLab } from './voice-lab';
import { listTtsMetas, isTtsConfigured, getDefaultTts } from '@/lib/tts/registry';
import type { TtsProviderId } from '@/lib/tts/types';

export const dynamic = 'force-dynamic';

export default async function VoicePage() {
  await connectDB();
  const active = plainOne<Character>(await characters.findOne({ isActive: true }));
  const recent = plain<AudioClip>(await audioClips.find().sort({ createdAt: -1 }).limit(30));

  // Engine status for the header subtitle
  const metas = listTtsMetas();
  const flags = await Promise.all(
    metas.map(async (m) => ({ id: m.id, ok: await isTtsConfigured(m.id as TtsProviderId) }))
  );
  const free = metas.filter((m) => !m.requiresKey).length;
  const keyed = flags.filter((f) => f.ok && metas.find((m) => m.id === f.id)?.requiresKey).length;
  const defaultId = await getDefaultTts();
  const defaultName = metas.find((m) => m.id === defaultId)?.name || 'Edge TTS';

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        eyebrow="Voice"
        title="Voice lab"
        description={`${free + keyed} engine${free + keyed === 1 ? '' : 's'} ready · default: ${defaultName} · ${free} free + ${keyed} keyed`}
      />
      <VoiceLab character={active ?? undefined} recent={recent} />
    </div>
  );
}
