import Link from 'next/link';
import { connectDB, characters, images, trends, videoProjects, audioClips, plain, plainOne } from '@/lib/db/client';
import type { VideoProject, Image, Character } from '@/lib/db/schema';
import { PageHeader } from '@/components/shared/page-header';
import { ArrowRight, Calendar as CalIcon, ImageIcon, TrendingUp, Mic, Plus, Sparkles, Cpu, Cloud } from 'lucide-react';
import { truncate, toDisplayUrl, cn } from '@/lib/utils';
import { listProviderMetas, isProviderConfigured } from '@/lib/ai/providers/registry';
import type { ProviderId } from '@/lib/ai/providers/types';
import { listHostMetas, isHostConfigured, getDefaultHost } from '@/lib/hosting/registry';
import type { HostingProviderId } from '@/lib/hosting/types';

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
  return plain<Image>(await images.find().sort({ createdAt: -1 }).limit(12));
}

async function getActiveCharacter() {
  await connectDB();
  return plainOne<Character>(await characters.findOne({ isActive: true }));
}

async function getAiStatus() {
  const metas = listProviderMetas();
  const flags = await Promise.all(metas.map(async (m) => ({
    id: m.id, name: m.name, configured: await isProviderConfigured(m.id as ProviderId),
  })));
  return {
    total: flags.length,
    configured: flags.filter((f) => f.configured).length,
    list: flags,
  };
}

async function getHostStatus() {
  const metas = listHostMetas();
  const flags = await Promise.all(metas.map(async (m) => ({
    id: m.id, name: m.name, requiresKey: m.requiresKey,
    configured: await isHostConfigured(m.id as HostingProviderId),
    capabilities: m.capabilities,
  })));
  const defaultHost = await getDefaultHost();
  return {
    list: flags,
    configured: flags.filter((f) => f.configured && f.id !== 'local').length,
    total: flags.filter((f) => f.requiresKey).length,
    defaultHost,
    defaultName: metas.find((m) => m.id === defaultHost)?.name || 'Local',
  };
}

export default async function HomePage() {
  const [stats, upcoming, recentImages, active, aiStatus, hostStatus] = await Promise.all([
    getStats(), getUpcoming(), getRecentImages(), getActiveCharacter(), getAiStatus(), getHostStatus(),
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
            <QuickAction href="/studio" label="AI Studio" />
            <QuickAction href="/trends" label="Save trend" />
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
                <Link
                  key={img.id} href="/library"
                  className="group relative block aspect-[3/4] overflow-hidden rounded-md bg-elevated"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={toDisplayUrl(img.remoteUrl || img.thumbnailPath || img.filePath)}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {img.hostProvider && img.hostProvider !== 'local' && (
                    <span className="absolute right-1.5 top-1.5 inline-flex items-center gap-0.5 rounded-full bg-black/50 px-1.5 py-0.5 text-[9px] text-white/90 backdrop-blur">
                      <Cloud className="h-2 w-2" />
                      {img.hostProvider}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}
          <Link
            href="/library"
            className="card card-hover flex items-center justify-between px-4 py-3"
          >
            <div>
              <p className="text-xs font-medium">Browse all images</p>
              <p className="text-[10px] text-muted">{stats.images} in library · default: {hostStatus.defaultName}</p>
            </div>
            <ArrowRight className="h-3 w-3 text-muted" />
          </Link>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="label-tiny flex items-center gap-1.5">
                <Cpu className="h-3 w-3" /> AI providers
              </p>
              <h3 className="mt-1 font-display text-2xl">
                {aiStatus.configured} / {aiStatus.total} connected
              </h3>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {aiStatus.list.map((p) => (
                  <span key={p.id} className={p.configured ? 'pill pill-success' : 'pill'}>
                    {p.name}
                  </span>
                ))}
              </div>
            </div>
            <Link href="/studio" className="btn-primary shrink-0">
              <Cpu className="h-4 w-4" /> AI Studio
            </Link>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="label-tiny flex items-center gap-1.5">
                <Cloud className="h-3 w-3" /> Image hosts
              </p>
              <h3 className="mt-1 font-display text-2xl">
                {hostStatus.configured} cloud host{hostStatus.configured === 1 ? '' : 's'}
              </h3>
              <p className="mt-0.5 text-xs text-muted">
                Default: <span className="text-ink font-medium">{hostStatus.defaultName}</span>
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {hostStatus.list.map((h) => (
                  <span
                    key={h.id}
                    className={cn(
                      'pill',
                      h.id === hostStatus.defaultHost && 'pill-accent',
                      h.configured && h.id !== hostStatus.defaultHost && 'pill-success',
                    )}
                  >
                    {h.id === hostStatus.defaultHost && '★ '}
                    {h.name}
                  </span>
                ))}
              </div>
            </div>
            <Link href="/library" className="btn-primary shrink-0">
              <Cloud className="h-4 w-4" /> Library
            </Link>
          </div>
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
