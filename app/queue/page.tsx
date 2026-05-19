import { connectDB, videoProjects } from '@/lib/db/client';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { ListChecks, ExternalLink, Hash } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function QueuePage() {
  await connectDB();
  const ready = (await videoProjects.find({ status: { $in: ['edited', 'ready'] } }).sort({ scheduledDate: -1 })).map(r => r.toJSON());

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        eyebrow="Ship it"
        title="Post queue"
        description="Videos ready to publish. Open TikTok, paste your caption, toggle AI disclosure."
      />

      {ready.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="Nothing in the queue"
          description="Mark a video as 'edited' or 'ready' to see it here."
          action={<Link href="/calendar" className="btn-primary">View calendar</Link>}
        />
      ) : (
        <ul className="space-y-3 max-w-3xl">
          {ready.map((p) => (
            <li key={p.id} className="card p-5">
              <div className="flex flex-wrap items-start gap-4">
                <div className="min-w-0 flex-1">
                  <p className="label-tiny">{p.scheduledDate || 'No date'} · {p.contentType}</p>
                  <h3 className="font-display text-xl mt-1">{p.title}</h3>
                  {p.caption && (
                    <p className="mt-2 line-clamp-2 text-sm text-muted bangla" lang="bn">{p.caption}</p>
                  )}
                  {(p.hashtags || []).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {(p.hashtags || []).slice(0, 6).map((h) => (
                        <span key={h} className="pill text-[10px]"><Hash className="h-2.5 w-2.5" />{h.replace(/^#/, '')}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <Link href={`/projects/${p.id}`} className="btn-ghost text-xs">Open</Link>
                  <a href="https://www.tiktok.com/upload" target="_blank" rel="noreferrer" className="btn-primary text-xs">
                    <ExternalLink className="h-3 w-3" /> TikTok
                  </a>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
