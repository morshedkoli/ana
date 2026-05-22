'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  TrendingUp, Plus, ExternalLink, Trash2, RefreshCw, Music,
  Play, Download, AlertTriangle, Check, Clock, FileVideo, Wrench,
} from 'lucide-react';
import type { Trend } from '@/lib/db/schema';
import { cn, trendLifecycle, formatRelative, toDisplayUrl } from '@/lib/utils';

const CATEGORIES = ['dance', 'talking', 'transition', 'audio', 'comedy', 'other'] as const;
type DownloadStatus = 'pending' | 'downloading' | 'ready' | 'failed' | 'skipped';

interface BinaryStatus {
  ready: boolean;
  path: string | null;
  source: 'env' | 'local' | 'path' | 'missing';
  version?: string;
  bytes?: number;
}

export function TrendsBoard({
  trends: initial, initialBinary,
}: {
  trends: Trend[];
  initialBinary?: BinaryStatus;
}) {
  const [trends, setTrends] = useState(initial);
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState<typeof CATEGORIES[number]>('dance');
  const [downloadVideo, setDownloadVideo] = useState(true);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | typeof CATEGORIES[number]>('all');
  const [playing, setPlaying] = useState<Trend | null>(null);

  const [binary, setBinary] = useState<BinaryStatus>(
    initialBinary || { ready: false, path: null, source: 'missing' }
  );
  const [installing, setInstalling] = useState(false);

  async function refreshBinary() {
    try {
      const r = await fetch('/api/trends/binary');
      if (r.ok) setBinary(await r.json());
    } catch { /* ignore */ }
  }

  async function installBinary(reinstall = false) {
    setInstalling(true);
    toast.info(reinstall ? 'Reinstalling yt-dlp…' : 'Downloading yt-dlp (~30 MB)…');
    try {
      const r = await fetch('/api/trends/binary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reinstall }),
      });
      const data = await r.json();
      if (!r.ok || !data.ok) throw new Error(data.error || 'Install failed');
      setBinary(data);
      toast.success(`yt-dlp ${data.version || ''} ready`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Install failed');
    } finally {
      setInstalling(false);
    }
  }

  // Poll any trend whose download is still in flight
  const pollersRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  useEffect(() => {
    const map = pollersRef.current;
    for (const t of trends) {
      const status = (t.downloadStatus || 'ready') as DownloadStatus;
      const inFlight = status === 'downloading' || status === 'pending';
      const alreadyPolling = map.has(t.id);
      if (inFlight && !alreadyPolling) {
        const handle = setInterval(() => pollOne(t.id), 2500);
        map.set(t.id, handle);
      } else if (!inFlight && alreadyPolling) {
        clearInterval(map.get(t.id)!);
        map.delete(t.id);
      }
    }
    return () => {
      for (const handle of map.values()) clearInterval(handle);
      map.clear();
    };
  }, [trends]);

  async function pollOne(id: string) {
    try {
      const r = await fetch(`/api/trends/${id}`);
      if (!r.ok) return;
      const fresh = (await r.json()) as Trend;
      setTrends((prev) => prev.map((t) => (t.id === id ? fresh : t)));
    } catch { /* ignore */ }
  }

  async function save() {
    if (!url.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/trends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, category, download: downloadVideo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTrends((p) => [data, ...p]);
      setUrl('');
      toast.success(downloadVideo ? 'Trend saved · downloading video…' : 'Trend saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    } finally { setLoading(false); }
  }

  async function remove(id: string) {
    if (!confirm('Delete this trend (also removes the local video file)?')) return;
    setTrends((p) => p.filter((t) => t.id !== id));
    await fetch(`/api/trends/${id}`, { method: 'DELETE' });
  }

  async function redownload(id: string) {
    const r = await fetch(`/api/trends/${id}/redownload`, { method: 'POST' });
    if (r.ok) {
      setTrends((prev) => prev.map((t) =>
        t.id === id ? { ...t, downloadStatus: 'downloading', downloadError: null } : t
      ));
      // The redownload may auto-install the binary if missing — refresh banner
      void refreshBinary();
      toast.info('Downloading…');
    } else toast.error('Retry failed');
  }

  const filtered = filter === 'all' ? trends : trends.filter((t) => t.category === filter);

  return (
    <div className="space-y-6">
      {/* yt-dlp install banner */}
      {!binary.ready && (
        <div className="card border-amber/40 bg-amber/10 p-4 flex flex-wrap items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-amber shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">yt-dlp isn&apos;t installed yet</p>
            <p className="text-xs text-muted">
              We&apos;ll fetch a single ~30 MB binary into <code className="rounded bg-bg px-1">storage/bin/</code>
              {' '}— no Python or pip required.
            </p>
          </div>
          <button
            onClick={() => installBinary(false)}
            disabled={installing}
            className="btn-primary"
          >
            {installing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Wrench className="h-4 w-4" />}
            {installing ? 'Installing…' : 'Install yt-dlp'}
          </button>
        </div>
      )}

      {binary.ready && binary.source === 'local' && (
        <p className="text-xs text-muted -mb-2">
          <Check className="inline h-3 w-3 text-success mr-1" />
          yt-dlp {binary.version || ''} ready
          <span className="mx-1">·</span>
          <button
            onClick={() => installBinary(true)}
            disabled={installing}
            className="text-accent underline-offset-4 hover:underline"
          >
            update binary
          </button>
        </p>
      )}

      {/* Save bar */}
      <div className="card p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()}
            placeholder="Paste TikTok / YouTube Shorts / Reels URL"
            className="input-base flex-1 sm:min-w-[260px]"
          />
          <div className="flex gap-2">
            <select value={category} onChange={(e) => setCategory(e.target.value as typeof CATEGORIES[number])} className="input-base flex-1 sm:flex-none sm:!w-auto">
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={save} disabled={loading} className="btn-primary">
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Save
            </button>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={downloadVideo}
              onChange={(e) => setDownloadVideo(e.target.checked)}
              className="accent-accent"
            />
            <Download className="h-3.5 w-3.5" />
            <span>Download video + thumbnail to local storage</span>
          </label>
          <p className="text-xs text-muted ml-auto">
            Powered by <code className="rounded bg-bg px-1">yt-dlp</code>.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-1.5">
        <FilterPill active={filter === 'all'} onClick={() => setFilter('all')}>All ({trends.length})</FilterPill>
        {CATEGORIES.map(c => {
          const n = trends.filter((t) => t.category === c).length;
          return <FilterPill key={c} active={filter === c} onClick={() => setFilter(c)}>{c} ({n})</FilterPill>;
        })}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <TrendingUp className="mx-auto mb-3 h-8 w-8 text-muted" />
          <p className="text-sm text-muted">No trends yet. Paste a URL above to start your inspiration library.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t) => {
            const life = trendLifecycle(t.savedAt!);
            const status = (t.downloadStatus || (t.videoPath ? 'ready' : 'skipped')) as DownloadStatus;
            const hasVideo = Boolean(t.videoPath);
            return (
              <div key={t.id} className="card card-hover overflow-hidden flex flex-col">
                <button
                  onClick={() => hasVideo && setPlaying(t)}
                  disabled={!hasVideo}
                  className={cn(
                    'relative block w-full text-left',
                    hasVideo && 'cursor-pointer'
                  )}
                  aria-label={hasVideo ? 'Play locally saved video' : 'Thumbnail'}
                >
                  {t.thumbnailPath ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={toDisplayUrl(t.thumbnailPath)} alt="" className="h-44 w-full object-cover" />
                  ) : (
                    <div className="flex h-44 items-center justify-center bg-elevated">
                      <TrendingUp className="h-8 w-8 text-muted" />
                    </div>
                  )}
                  {hasVideo && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/30 transition-colors">
                      <div className="rounded-full bg-accent/90 p-3 opacity-0 transition-opacity group-hover:opacity-100 hover:opacity-100">
                        <Play className="h-5 w-5 text-accent-fg fill-current" />
                      </div>
                    </div>
                  )}
                  <DownloadBadge status={status} />
                </button>

                <div className="space-y-2 p-3 flex-1 flex flex-col">
                  <div className="flex items-center justify-between gap-2">
                    <span className="pill pill-accent">{t.platform}</span>
                    <LifeBadge life={life} />
                  </div>
                  <p className="text-sm font-medium line-clamp-2 leading-snug">{t.title || 'Untitled'}</p>
                  {t.creator && <p className="text-xs text-muted">@{t.creator}</p>}
                  {t.audioName && (
                    <p className="flex items-center gap-1 text-xs text-muted">
                      <Music className="h-3 w-3" /> {t.audioName}
                    </p>
                  )}
                  {(t.hashtags || []).length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {(t.hashtags || []).slice(0, 3).map((h) => (
                        <span key={h} className="text-[10px] text-muted">{h}</span>
                      ))}
                    </div>
                  )}
                  {status === 'failed' && t.downloadError && (
                    <p className="text-[11px] text-danger truncate" title={t.downloadError}>
                      {t.downloadError}
                    </p>
                  )}
                  {hasVideo && t.videoBytes && (
                    <p className="flex items-center gap-1 text-[10px] text-muted">
                      <FileVideo className="h-2.5 w-2.5" />
                      {(t.videoBytes / (1024 * 1024)).toFixed(1)} MB saved locally
                    </p>
                  )}
                  <div className="mt-auto flex items-center justify-between pt-1">
                    <span className="text-[10px] text-muted">{formatRelative(t.savedAt!)}</span>
                    <div className="flex gap-1">
                      {hasVideo && (
                        <a
                          href={toDisplayUrl(t.videoPath!)}
                          download
                          className="btn-icon h-7 w-7"
                          title="Download MP4"
                        >
                          <Download className="h-3 w-3" />
                        </a>
                      )}
                      {(status === 'failed' || status === 'skipped') && (
                        <button
                          onClick={() => redownload(t.id)}
                          className="btn-icon h-7 w-7"
                          title="Retry download"
                        >
                          <RefreshCw className="h-3 w-3" />
                        </button>
                      )}
                      <a href={t.sourceUrl} target="_blank" rel="noreferrer" className="btn-icon h-7 w-7" title="Open original">
                        <ExternalLink className="h-3 w-3" />
                      </a>
                      <button onClick={() => remove(t.id)} className="btn-icon h-7 w-7 hover:text-danger" title="Delete">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Inline player */}
      {playing && playing.videoPath && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-2 sm:p-4 backdrop-blur-sm animate-fade-in"
          onClick={() => setPlaying(null)}
        >
          <div
            className="relative w-full max-w-3xl rounded-lg bg-surface border border-border overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPlaying(null)}
              className="absolute right-3 top-3 z-10 btn-icon"
              aria-label="Close"
            >
              ×
            </button>
            <video
              src={toDisplayUrl(playing.videoPath)}
              controls autoPlay
              className="w-full max-h-[80vh] bg-black"
            />
            <div className="p-4 space-y-1">
              <p className="font-medium text-sm">{playing.title || 'Untitled'}</p>
              {playing.creator && <p className="text-xs text-muted">@{playing.creator}</p>}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {(playing.hashtags || []).slice(0, 8).map((h) => (
                  <span key={h} className="pill text-[10px]">{h}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DownloadBadge({ status }: { status: DownloadStatus }) {
  const cfg: Record<DownloadStatus, { icon: React.ElementType; label: string; cls: string }> = {
    pending:     { icon: Clock,          label: 'queued',      cls: 'bg-muted/40 text-white' },
    downloading: { icon: RefreshCw,      label: 'downloading', cls: 'bg-amber/80 text-white' },
    ready:       { icon: Check,          label: 'saved',       cls: 'bg-success/80 text-white' },
    failed:      { icon: AlertTriangle,  label: 'failed',      cls: 'bg-danger/80 text-white' },
    skipped:     { icon: ExternalLink,   label: 'remote only', cls: 'bg-elevated/80 text-muted' },
  };
  const c = cfg[status] || cfg.skipped;
  const Icon = c.icon;
  return (
    <span className={cn(
      'absolute left-2 top-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium backdrop-blur',
      c.cls
    )}>
      <Icon className={cn('h-2.5 w-2.5', status === 'downloading' && 'animate-spin')} />
      {c.label}
    </span>
  );
}

function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={cn('rounded-full border px-3 py-1 text-xs font-medium transition-colors',
      active ? 'bg-accent border-accent text-accent-fg' : 'bg-elevated border-border text-muted hover:text-ink')}>
      {children}
    </button>
  );
}

function LifeBadge({ life }: { life: 'fresh' | 'peaking' | 'dying' }) {
  const cls = life === 'fresh' ? 'pill-success' : life === 'peaking' ? 'pill-amber' : 'pill-danger';
  const emoji = life === 'fresh' ? '🟢' : life === 'peaking' ? '🟡' : '🔴';
  return <span className={cn('pill', cls)}>{emoji} {life}</span>;
}
