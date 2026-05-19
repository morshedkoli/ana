import { connectDB, images } from '@/lib/db/client';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { ImageIcon, Plus } from 'lucide-react';
import Link from 'next/link';
import { LibraryGrid } from './library-grid';

export const dynamic = 'force-dynamic';

export default async function LibraryPage() {
  await connectDB();
  const rows = (await images.find().sort({ createdAt: -1 })).map(r => r.toJSON());

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        eyebrow="Assets"
        title="Image library"
        description={`${rows.length} image${rows.length === 1 ? '' : 's'} across all sources`}
        actions={
          <>
            <Link href="/generate" className="btn-primary">
              <Plus className="h-4 w-4" /> Generate
            </Link>
          </>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title="No images yet"
          description="Generate your first character image or upload from external tools."
          action={<Link href="/generate" className="btn-primary"><Plus className="h-4 w-4" /> Generate</Link>}
        />
      ) : (
        <LibraryGrid images={rows} />
      )}
    </div>
  );
}
