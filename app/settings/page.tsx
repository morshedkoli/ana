import { connectDB, settings } from '@/lib/db/client';
import { PageHeader } from '@/components/shared/page-header';
import { SettingsForm } from './settings-form';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  await connectDB();
  const all = await settings.find();
  const map = Object.fromEntries(all.map((s) => [s.key, s.value]));
  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        eyebrow="Config"
        title="Settings"
        description="Keys, defaults, and backup."
      />
      <SettingsForm initial={map} />
    </div>
  );
}
