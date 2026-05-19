'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { TrendingUp, Plus, ExternalLink, Trash2, RefreshCw, Music } from 'lucide-react';
import type { Trend } from '@/lib/db/schema';
import { cn, trendLifecycle, formatRelative } from '@/lib/utils';

const CATEGORIES = ['dance', 'talking', 'transition', 'audio', 'comedy', 'other'] as const;

export function TrendsBoard({ trends: initial }: { trends: Trend[] }) {
  const [trends, setTrends] = useState(initial);
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState<typeof CATEGORIES[number]>('dance');
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | typeof CATEGORIES[number]>('all');

  async function save() {
    if (!url.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/trends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, category }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTrends((p) => [data, ...p]);
      setUrl('');
      toast.success('Trend saved');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed';
      toast.error(msg);
    } finally { setLoading(false); }
  }

  async function remove(id: number) {
    if (!confirm('Delete this trend?')) return;
    setTrends((p) => p.filter((t) => t.id !== id));
    await fetch(`/api/trends/${id}`, { method: 'DELETE' });
  }

  const filtered = filter === 'all' ? trends : trends.filter((t) => t.category === filter);

  return (
    <div className="space-y-6">
      {/* Save bar */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-2">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()}
            placeholder="Paste TikTok / YouTube Shorts / Reels URL"
            className="input-base flex-1 min-w-[260px]"
          />
          <select value={category} onChange={(e) => setCategory(e.target.value as typeof CATEGORIES[number])} className="input-base !w-auto">
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={save} disabled={loading} className="btn-primary">
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Save
          </button>
        </div>
        <p className="mt-2 text-xs text-muted">
          Uses <code className="rounded bg-bg px-1">yt-dlp</code> to auto-fetch title, hashtags, creator, thumbnail.
        </p>
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
            return (
              <div key={t.id} className="card card-hover overflow-hidden">
                {t.thumbnailPath ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={toPublic(t.thumbnailPath)} alt="" className="h-44 w-full object-cover" />
                ) : (
                  <div className="flex h-44 items-center justify-center bg-elevated">
                    <TrendingUp className="h-8 w-8 text-muted" />
                  </div>
                )}
                <div className="space-y-2 p-3">
                  <div className="flex items-center justify-between">
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
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-muted">{formatRelative(t.savedAt!)}</span>
                    <div className="flex gap-1">
                      <a href={t.sourceUrl} target="_blank" rel="noreferrer" className="btn-icon h-7 w-7">
                        <ExternalLink className="h-3 w-3" />
                      </a>
                      <button onClick={() => remove(t.id)} className="btn-icon h-7 w-7 hover:text-danger">
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
    </div>
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

function toPublic(p: string): string {
  if (p.startsWith('/storage/')) return p;
  const idx = p.indexOf('/storage/');
  return idx >= 0 ? p.slice(idx) : p;
}
