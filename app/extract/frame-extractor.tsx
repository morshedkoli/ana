'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  Upload, Link as LinkIcon, Scissors, RefreshCw, Check, X, Trash2,
  Save, FileVideo, Play, ImageIcon, ListChecks, Square, CheckSquare, ExternalLink,
} from 'lucide-react';
import type { ExtractedFrame, Trend } from '@/lib/db/schema';
import { cn, toDisplayUrl, formatRelative, formatDuration } from '@/lib/utils';

interface ExtractedBatch {
  batchId: string;
  sourceVideoPublicPath?: string | null;
  sourceUrl?: string | null;
  trendId?: string | null;
  createdAt: string;
  frames: ExtractedFrame[];
}

const REF_TYPES = ['pose', 'outfit', 'lighting', 'composition', 'expression'] as const;
type RefType = typeof REF_TYPES[number];
type Mode = 'url' | 'upload' | 'trend';

export function FrameExtractor({
  initialFrames, downloadedTrends,
}: {
  initialFrames: ExtractedFrame[];
  downloadedTrends: Trend[];
}) {
  const [mode, setMode] = useState<Mode>('url');
  const [url, setUrl] = useState('');
  const [trendId, setTrendId] = useState<string>('');
  const [everySec, setEverySec] = useState(2);
  const [maxFrames, setMaxFrames] = useState(20);
  const [loading, setLoading] = useState(false);
  const [activeBatch, setActiveBatch] = useState<string | null>(null);
  const [allFrames, setAllFrames] = useState<ExtractedFrame[]>(initialFrames);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [refType, setRefType] = useState<RefType>('pose');
  const [tagsInput, setTagsInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [lightbox, setLightbox] = useState<ExtractedFrame | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // Group frames into batches for the history view
  const batches = useMemo<ExtractedBatch[]>(() => {
    const map = new Map<string, ExtractedBatch>();
    for (const f of allFrames) {
      const id = f.batchId || `legacy_${f.id}`;
      if (!map.has(id)) {
        map.set(id, {
          batchId: id,
          sourceVideoPublicPath: f.sourceVideoPublicPath || null,
          sourceUrl: f.sourceUrl || null,
          trendId: f.trendId || null,
          createdAt: f.createdAt || new Date().toISOString(),
          frames: [],
        });
      }
      map.get(id)!.frames.push(f);
    }
    // Sort frames by timestamp inside each batch
    for (const b of map.values()) {
      b.frames.sort((a, z) => (a.timestampSec || 0) - (z.timestampSec || 0));
    }
    // Newest batch first
    return Array.from(map.values()).sort(
      (a, z) => +new Date(z.createdAt) - +new Date(a.createdAt)
    );
  }, [allFrames]);

  const visibleBatch = activeBatch
    ? batches.find((b) => b.batchId === activeBatch)
    : batches[0];

  useEffect(() => {
    if (!activeBatch && batches.length > 0) setActiveBatch(batches[0].batchId);
  }, [batches, activeBatch]);

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (!visibleBatch) return;
    const ids = visibleBatch.frames.map((f) => f.id);
    const allSel = ids.every((i) => selected.has(i));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSel) ids.forEach((i) => next.delete(i));
      else ids.forEach((i) => next.add(i));
      return next;
    });
  }

  async function extract(payload: BodyInit | Record<string, unknown>) {
    setLoading(true);
    setSelected(new Set());
    try {
      const init: RequestInit = payload instanceof FormData
        ? { method: 'POST', body: payload }
        : {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        };
      const res = await fetch('/api/extract-frames', init);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Extraction failed');
      // Refresh full list from server so the new batch shows in history
      const r = await fetch('/api/extract-frames?limit=200');
      const fresh = await r.json();
      setAllFrames(fresh.frames || []);
      setActiveBatch(data.batchId);
      toast.success(`Extracted ${data.frames.length} frame${data.frames.length === 1 ? '' : 's'}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  function extractFromUrl() {
    if (!url.trim()) { toast.error('Paste a URL'); return; }
    extract({ url, everySec, maxFrames });
  }

  function extractFromTrend() {
    if (!trendId) { toast.error('Pick a downloaded trend first'); return; }
    const t = downloadedTrends.find((x) => x.id === trendId);
    if (!t?.videoPath) { toast.error('Trend has no local video'); return; }
    extract({ videoPublicPath: t.videoPath, trendId, everySec, maxFrames });
  }

  function extractFromFile(file: File) {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('everySec', String(everySec));
    fd.append('maxFrames', String(maxFrames));
    extract(fd);
  }

  async function saveSelected() {
    const ids = Array.from(selected);
    if (ids.length === 0) { toast.error('Select frames first'); return; }
    setSaving(true);
    try {
      const tags = tagsInput.split(',').map((s) => s.trim()).filter(Boolean);
      const r = await fetch('/api/extract-frames/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frameIds: ids, referenceType: refType, tags }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      // Mark them as saved locally
      setAllFrames((prev) => prev.map((f) =>
        ids.includes(f.id) ? { ...f, savedToLibrary: true, referenceType: refType } : f
      ));
      setSelected(new Set());
      toast.success(`Saved ${data.saved} → ${data.hostProvider}${data.failed ? ` · ${data.failed} failed` : ''}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function deleteFrame(id: string) {
    if (!confirm('Delete this frame?')) return;
    setAllFrames((prev) => prev.filter((f) => f.id !== id));
    setSelected((prev) => { const n = new Set(prev); n.delete(id); return n; });
    await fetch(`/api/extract-frames/${id}`, { method: 'DELETE' });
  }

  async function deleteBatch(batchId: string) {
    const batch = batches.find((b) => b.batchId === batchId);
    if (!batch) return;
    if (!confirm(`Delete all ${batch.frames.length} frames in this batch?`)) return;
    setAllFrames((prev) => prev.filter((f) => f.batchId !== batchId));
    setActiveBatch(null);
    await Promise.all(batch.frames.map((f) =>
      fetch(`/api/extract-frames/${f.id}`, { method: 'DELETE' })
    ));
    toast.success('Batch deleted');
  }

  return (
    <div className="space-y-6">
      {/* Source picker */}
      <div className="card p-5 space-y-4">
        <div className="flex flex-wrap gap-2">
          <ModeButton active={mode === 'url'} onClick={() => setMode('url')} icon={LinkIcon}>
            From URL
          </ModeButton>
          <ModeButton active={mode === 'upload'} onClick={() => setMode('upload')} icon={Upload}>
            Upload file
          </ModeButton>
          <ModeButton active={mode === 'trend'} onClick={() => setMode('trend')} icon={FileVideo}>
            From saved trend
            <span className="ml-1 text-[10px] opacity-70">({downloadedTrends.length})</span>
          </ModeButton>
        </div>

        {mode === 'url' && (
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && extractFromUrl()}
            placeholder="TikTok / YouTube / Reels / Instagram URL"
            className="input-base"
          />
        )}

        {mode === 'upload' && (
          <>
            <input
              ref={fileInput} type="file" accept="video/*" hidden
              onChange={(e) => { if (e.target.files?.[0]) extractFromFile(e.target.files[0]); e.target.value = ''; }}
            />
            <button
              onClick={() => fileInput.current?.click()}
              className="btn-ghost w-full py-8 border-dashed flex-col gap-1"
            >
              <Upload className="h-5 w-5" />
              <span>Choose video file</span>
              <span className="text-[10px] text-muted">mp4 / mov / webm · max ~100 MB</span>
            </button>
          </>
        )}

        {mode === 'trend' && (
          downloadedTrends.length === 0 ? (
            <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted">
              No locally-saved trends yet. Save a trend with the download checkbox on, then come back.
            </div>
          ) : (
            <select
              value={trendId}
              onChange={(e) => setTrendId(e.target.value)}
              className="input-base"
            >
              <option value="">— pick a trend —</option>
              {downloadedTrends.map((t) => (
                <option key={t.id} value={t.id}>
                  [{t.platform || 'video'}] {t.title || t.sourceUrl}
                </option>
              ))}
            </select>
          )
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-tiny">Frame every {everySec}s</label>
            <input
              type="range" min={0.5} max={10} step={0.5} value={everySec}
              onChange={(e) => setEverySec(parseFloat(e.target.value))}
              className="mt-2 w-full"
            />
            <p className="mt-1 text-[10px] text-muted">
              ~{maxFrames} frames covers ~{formatDuration(maxFrames * everySec)} of video
            </p>
          </div>
          <div>
            <label className="label-tiny">Max frames: {maxFrames}</label>
            <input
              type="range" min={5} max={120} step={5} value={maxFrames}
              onChange={(e) => setMaxFrames(parseInt(e.target.value))}
              className="mt-2 w-full"
            />
          </div>
        </div>

        {mode !== 'upload' && (
          <button
            onClick={mode === 'url' ? extractFromUrl : extractFromTrend}
            disabled={loading || (mode === 'url' && !url.trim()) || (mode === 'trend' && !trendId)}
            className="btn-primary w-full"
          >
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Scissors className="h-4 w-4" />}
            {loading
              ? (mode === 'url' ? 'Downloading + extracting…' : 'Extracting…')
              : 'Extract frames'}
          </button>
        )}

        {loading && mode === 'upload' && (
          <p className="text-xs text-muted text-center">
            <RefreshCw className="inline h-3 w-3 animate-spin mr-1" />
            Extracting frames…
          </p>
        )}
      </div>

      {/* Batch history */}
      {batches.length > 0 && (
        <div className="card p-3">
          <p className="label-tiny mb-2 px-1">Past extractions ({batches.length})</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {batches.map((b) => {
              const active = b.batchId === visibleBatch?.batchId;
              const cover = b.frames[0];
              return (
                <button
                  key={b.batchId}
                  onClick={() => { setActiveBatch(b.batchId); setSelected(new Set()); }}
                  className={cn(
                    'shrink-0 flex items-center gap-2 rounded-md border p-2 text-left transition-colors min-w-[180px] max-w-[260px]',
                    active ? 'border-accent bg-elevated' : 'border-border hover:border-muted'
                  )}
                >
                  {cover?.publicPath ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={toDisplayUrl(cover.publicPath)}
                      alt=""
                      className="h-12 w-9 shrink-0 rounded object-cover"
                    />
                  ) : (
                    <div className="h-12 w-9 shrink-0 rounded bg-elevated flex items-center justify-center">
                      <ImageIcon className="h-4 w-4 text-muted" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">
                      {b.frames.length} frame{b.frames.length === 1 ? '' : 's'}
                    </p>
                    <p className="text-[10px] text-muted truncate">
                      {b.sourceUrl || (b.sourceVideoPublicPath ? 'upload' : 'extracted')}
                    </p>
                    <p className="text-[10px] text-muted">{formatRelative(b.createdAt)}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Active batch */}
      {visibleBatch && (
        <div className="space-y-3">
          {/* Source preview + bulk actions */}
          <div className="card p-4 space-y-3">
            <div className="flex flex-wrap items-start gap-3">
              {visibleBatch.sourceVideoPublicPath && (
                <video
                  src={toDisplayUrl(visibleBatch.sourceVideoPublicPath)}
                  controls
                  className="w-full sm:w-56 rounded-md bg-black aspect-[9/16] object-contain"
                />
              )}
              <div className="flex-1 min-w-0 space-y-2">
                <div>
                  <p className="label-tiny">Source</p>
                  <p className="text-sm break-all">
                    {visibleBatch.sourceUrl ? (
                      <a
                        href={visibleBatch.sourceUrl}
                        target="_blank" rel="noreferrer"
                        className="text-accent hover:underline inline-flex items-center gap-1"
                      >
                        {visibleBatch.sourceUrl}
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    ) : (
                      <span className="text-muted">{visibleBatch.sourceVideoPublicPath || 'upload'}</span>
                    )}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={toggleSelectAll}
                    className="btn-ghost text-xs"
                  >
                    {visibleBatch.frames.every((f) => selected.has(f.id)) ? (
                      <><CheckSquare className="h-3.5 w-3.5" /> Deselect all</>
                    ) : (
                      <><Square className="h-3.5 w-3.5" /> Select all</>
                    )}
                  </button>
                  <span className="text-xs text-muted">
                    <ListChecks className="inline h-3 w-3 mr-1" />
                    {selected.size} of {visibleBatch.frames.length} selected
                  </span>
                  <button
                    onClick={() => deleteBatch(visibleBatch.batchId)}
                    className="btn-ghost text-xs hover:text-danger ml-auto"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete batch
                  </button>
                </div>
              </div>
            </div>

            {selected.size > 0 && (
              <div className="rounded-md border border-accent/40 bg-accent/5 p-3 space-y-2">
                <p className="label-tiny text-accent">Save {selected.size} frame{selected.size === 1 ? '' : 's'} as reference</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="label-tiny">Reference type</label>
                    <select
                      value={refType}
                      onChange={(e) => setRefType(e.target.value as RefType)}
                      className="input-base mt-1"
                    >
                      {REF_TYPES.map((rt) => <option key={rt} value={rt}>{rt}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2 sm:col-span-3">
                    <label className="label-tiny">Tags (comma separated)</label>
                    <input
                      value={tagsInput}
                      onChange={(e) => setTagsInput(e.target.value)}
                      placeholder="optional: dance, cafe, golden-hour"
                      className="input-base mt-1"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={saveSelected}
                    disabled={saving}
                    className="btn-primary"
                  >
                    {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Save {selected.size} to library
                  </button>
                  <button
                    onClick={() => setSelected(new Set())}
                    className="btn-ghost"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Frame grid */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {visibleBatch.frames.map((f) => {
              const isSelected = selected.has(f.id);
              return (
                <div
                  key={f.id}
                  className={cn(
                    'card group overflow-hidden relative transition-all',
                    isSelected && 'border-accent shadow-[0_0_24px_hsl(var(--accent)/0.15)]'
                  )}
                >
                  <button
                    onClick={() => toggleSelected(f.id)}
                    onDoubleClick={() => setLightbox(f)}
                    className="block w-full"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={toDisplayUrl(f.publicPath || f.framePath)}
                      alt=""
                      className="aspect-[9/16] w-full object-cover"
                    />
                    {isSelected && (
                      <div className="absolute inset-0 bg-accent/20 pointer-events-none" />
                    )}
                    <div className={cn(
                      'absolute left-2 top-2 flex h-5 w-5 items-center justify-center rounded border-2 transition-all',
                      isSelected
                        ? 'bg-accent border-accent text-accent-fg'
                        : 'bg-black/40 border-white/70 backdrop-blur'
                    )}>
                      {isSelected && <Check className="h-3 w-3" />}
                    </div>
                  </button>

                  <div className="p-2 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-muted">
                        @ {(f.timestampSec ?? 0).toFixed(1)}s
                      </p>
                      <div className="flex gap-0.5">
                        <button
                          onClick={() => setLightbox(f)}
                          className="btn-icon h-6 w-6"
                          title="Preview"
                        >
                          <Play className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => deleteFrame(f.id)}
                          className="btn-icon h-6 w-6 hover:text-danger"
                          title="Delete frame"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    {f.savedToLibrary ? (
                      <span className="pill pill-success text-[9px] py-0.5 w-full justify-center">
                        <Check className="h-2.5 w-2.5" />
                        saved {f.referenceType ? `· ${f.referenceType}` : ''}
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted block text-center">
                        Click to select
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {batches.length === 0 && !loading && (
        <div className="card p-12 text-center text-muted">
          <Scissors className="mx-auto mb-2 h-6 w-6" />
          <p className="text-sm">No frames yet. Pick a video above to get started.</p>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-2 sm:p-4 backdrop-blur-sm animate-fade-in"
          onClick={() => setLightbox(null)}
        >
          <div
            className="relative w-full max-w-4xl rounded-lg bg-surface border border-border overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setLightbox(null)}
              className="absolute right-3 top-3 z-10 btn-icon"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={toDisplayUrl(lightbox.publicPath || lightbox.framePath)}
              alt=""
              className="w-full max-h-[80vh] object-contain bg-black"
            />
            <div className="p-4 space-y-1">
              <p className="text-sm">
                Frame at <span className="font-mono">{(lightbox.timestampSec ?? 0).toFixed(2)}s</span>
              </p>
              {lightbox.sourceUrl && (
                <p className="text-xs text-muted truncate">
                  Source: <a href={lightbox.sourceUrl} target="_blank" rel="noreferrer" className="text-accent hover:underline">{lightbox.sourceUrl}</a>
                </p>
              )}
              {lightbox.savedToLibrary && (
                <span className="pill pill-success text-[10px]">
                  <Check className="h-2.5 w-2.5" /> in library{lightbox.referenceType ? ` · ${lightbox.referenceType}` : ''}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ModeButton({
  active, onClick, icon: Icon, children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn('btn-ghost', active && 'border-accent text-accent')}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  );
}
