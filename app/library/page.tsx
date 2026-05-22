import { connectDB, images, plain } from '@/lib/db/client';
import type { Image } from '@/lib/db/schema';
import { PageHeader } from '@/components/shared/page-header';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { LibraryGrid } from './library-grid';
import { listHostMetas, isHostConfigured, getDefaultHost } from '@/lib/hosting/registry';
import type { HostingProviderId } from '@/lib/hosting/types';

export const dynamic = 'force-dynamic';

export default async function LibraryPage() {
  await connectDB();
  const rows = plain<Image>(await images.find().sort({ createdAt: -1 }));

  // Quick host status for the header subtitle
  const metas = listHostMetas();
  const configured = await Promise.all(
    metas.map(async (m) => ({ id: m.id, ok: await isHostConfigured(m.id as HostingProviderId) }))
  );
  const connectedCount = configured.filter((c) => c.ok && c.id !== 'local').length;
  const defaultHost = await getDefaultHost();
  const defaultName = metas.find((m) => m.id === defaultHost)?.name || 'Local';

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        eyebrow="Assets"
        title="Image library"
        description={`${rows.length} image${rows.length === 1 ? '' : 's'} · default host: ${defaultName}${connectedCount > 0 ? ` · ${connectedCount} cloud host${connectedCount === 1 ? '' : 's'} connected` : ''}`}
        actions={
          <Link href="/generate" className="btn-primary">
            <Plus className="h-4 w-4" /> Generate
          </Link>
        }
      />
      <LibraryGrid images={rows} />
    </div>
  );
}
