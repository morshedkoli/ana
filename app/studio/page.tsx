import { PageHeader } from '@/components/shared/page-header';
import { listProviderMetas, getProviderCreds, isProviderConfigured } from '@/lib/ai/providers/registry';
import type { ProviderId } from '@/lib/ai/providers/types';
import { StudioWorkspace } from './studio-workspace';

export const dynamic = 'force-dynamic';

export default async function StudioPage() {
  const metas = listProviderMetas();
  const initial = await Promise.all(metas.map(async (m) => {
    const creds = await getProviderCreds(m.id as ProviderId);
    return {
      ...m,
      configured: await isProviderConfigured(m.id as ProviderId),
      hasKey: Boolean(creds.apiKey),
      hasAccount: Boolean(creds.apiAccount),
      // never send raw key to client; just account id (cloudflare) which is non-sensitive
      maskedAccount: creds.apiAccount || '',
    };
  }));

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        eyebrow="Plug it in"
        title="AI Studio"
        description="Connect free AI providers, browse their live models, and run image + text playgrounds."
      />
      <StudioWorkspace initialProviders={initial} />
    </div>
  );
}
