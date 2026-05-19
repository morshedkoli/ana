import Link from 'next/link';
import { connectDB, characters, images, trends, videoProjects, audioClips, plain, plainOne } from '@/lib/db/client';
import type { VideoProject, Image, Character } from '@/lib/db/schema';
import { PageHeader } from '@/components/shared/page-header';
import { ArrowRight, Calendar as CalIcon, ImageIcon, TrendingUp, Mic, Plus, Sparkles } from 'lucide-react';
import { truncate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

async function getStats() {
  await connectDB();
  const [c, i, t, a, p, posted] = await Promise.all([
    characters.countDocuments(),
    images.countDocuments(),
    trends.countDocuments(),
    audioClips.countDocuments(),
    videoProjects.countDocuments(),
    videoProjects.countDocuments({ status: 'posted' }),
  ]);
  return { characters: c, images: i, trends: t, audioClips: a, projects: p, posted };
}

async function getUpcoming() {
  await connectDB();
  return plain<VideoProject>(
    await videoProjects.find({ status: 'ready' }).sort({ scheduledDate: -1 }).limit(4)
  );
}

async function getRecentImages() {
  await connectDB();
  return plain<Image>(await images.find().sort({ createdAt: -1 }).limit(6));
}

async function getActiveCharacter() {
  await connectDB();
  return plainOne<Character>(await characters.findOne({ isActive: true }));
}

export default async function HomePage() {
  const [stats, upcoming, recentImages, active] = await Promise.all([
    getStats(), getUpcoming(), getRecentImages(), getActiveCharacter(),
  ]);

  return (
    <div className="space-y-12 animate-fade-in">
      <PageHeader
        eyebrow="Today"
        title={active ? `Hello, ${active.name}'s studio` : 'Studio'}
        description="Your end-to-end command center. Plan, generate, and publish from one place."
        actions={
          <Link href="/calendar" className="btn-primary">
            <Plus className="h-4 w-4" /> New video
          </Link>
        }
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Image library" value={stats.images} icon={ImageIcon} href="/library" />
        <StatCard label="Voice clips" value={stats.audioClips} icon={Mic} href="/voice" />
        <StatCard label="Trends saved" value={stats.trends} icon={TrendingUp} href="/trends" />
        <StatCard label="Posted" value={stats.posted} sub={`${stats.projects} total`} icon={CalIcon} href="/calendar" />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <div className="flex items-end justify-between">
            <h2 className="font-display text-2xl">Up next</h2>
            <Link href="/calendar" className="text-xs text-muted hover:text-ink inline-flex items-center gap-1">
              View calendar <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <div className="card p-6 text-sm text-muted">
              No videos queued. Open the <Link href="/calendar" className="text-accent underline-offset-4 hover:underline">calendar</Link> to plan one.
            </div>
          ) : (
            <ul className="space-y-2">
              {upcoming.map((p) => (
                <li key={p.id} className="card card-hover p-4">
                  <Link href={`/projects/${p.id}`} className="flex items-center gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-elevated">
                      <Sparkles className="h-4 w-4 text-accent" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{truncate(p.title, 60)}</p>
                      <p className="mt-0.5 text-xs text-muted">
                        {p.scheduledDate || 'unscheduled'} · {p.contentType}
                      </p>
                    </div>
                    <span className="pill pill-amber">{p.status}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <QuickAction href="/generate" label="Generate image" />
            <QuickAction href="/voice" label="Make voice" />
            <QuickAction href="/trends" label="Save trend" />
            <QuickAction href="/extract" label="Extract frames" />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-end justify-between">
            <h2 className="font-display text-2xl">Recent images</h2>
            <Link href="/library" className="text-xs text-muted hover:text-ink inline-flex items-center gap-1">
              Library <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {recentImages.length === 0 ? (
            <div className="card p-6 text-sm text-muted">
              No images yet. <Link href="/generate" className="text-accent underline-offset-4 hover:underline">Generate one</Link>.
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {recentImages.map((img) => (
                <Link key={img.id} href="/library" className="group block aspect-[3/4] overflow-hidden rounded-md bg-elevated">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.thumbnailPath || img.filePath.replace(/^.*\/storage\//, '/storage/')}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {active && (
        <section className="card p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="label-tiny">Active character</p>
              <h3 className="mt-1 font-display text-2xl">{active.name}</h3>
              <p className="mt-1 text-sm text-muted">
                Voice: {(active.voiceProfile as { voiceId?: string })?.voiceId || 'not set'}
              </p>
            </div>
            <Link href="/character" className="btn-ghost">
              Edit profile <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, icon: Icon, href }: {
  label: string; value: number; sub?: string; icon: React.ElementType; href: string;
}) {
  return (
    <Link href={href} className="card card-hover group p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="label-tiny">{label}</p>
          <p className="mt-3 font-display text-4xl font-medium">{value}</p>
          {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
        </div>
        <Icon className="h-4 w-4 text-muted transition-colors group-hover:text-accent" />
      </div>
    </Link>
  );
}

function QuickAction({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="card card-hover group flex items-center justify-between px-4 py-3">
      <span className="text-xs font-medium">{label}</span>
      <ArrowRight className="h-3 w-3 text-muted transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
