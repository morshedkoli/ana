'use client';

import { useState, useMemo, useRef } from 'react';
import type { Image } from '@/lib/db/schema';
import { Upload, Search, Heart, Trash2, X, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const SOURCES = ['all', 'cloudflare', 'pollinations', 'upload', 'extracted'] as const;

export function LibraryGrid({ images: initial }: { images: Image[] }) {
  const [imgs, setImgs] = useState(initial);
  const [search, setSearch] = useState('');
  const [source, setSource] = useState<(typeof SOURCES)[number]>('all');
  const [favOnly, setFavOnly] = useState(false);
  const [selected, setSelected] = useState<Image | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    return imgs.filter((i) => {
      if (source !== 'all' && i.source !== source) return false;
      if (favOnly && !i.isFavorite) return false;
      if (search) {
        const q = search.toLowerCase();
        const inPrompt = (i.prompt || '').toLowerCase().includes(q);
        const inTags = (i.tags || []).some((t) => t.toLowerCase().includes(q));
        const inNotes = (i.notes || '').toLowerCase().includes(q);
        if (!inPrompt && !inTags && !inNotes) return false;
      }
      return true;
    });
  }, [imgs, search, source, favOnly]);

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    toast.info(`Uploading ${files.length} image${files.length > 1 ? 's' : ''}…`);
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/images', { method: 'POST', body: fd });
      if (res.ok) {
        const data = await res.json();
        setImgs((prev) => [{ ...(data as Image), filePath: data.publicPath, createdAt: new Date().toISOString() }, ...prev]);
      } else toast.error(`Upload failed: ${file.name}`);
    }
    toast.success('Upload complete');
  }

  async function toggleFavorite(img: Image) {
    const newFav = !img.isFavorite;
    setImgs((prev) => prev.map((i) => i.id === img.id ? { ...i, isFavorite: newFav } : i));
    await fetch(`/api/images/${img.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isFavorite: newFav, tags: img.tags, qualityScore: img.qualityScore, notes: img.notes }),
    });
  }

  async function deleteImage(img: Image) {
    if (!confirm('Delete this image permanently?')) return;
    setImgs((prev) => prev.filter((i) => i.id !== img.id));
    setSelected(null);
    await fetch(`/api/images/${img.id}`, { method: 'DELETE' });
    toast.success('Deleted');
  }

  return (
    <>
      {/* Toolbar */}
      <div className="card flex flex-wrap items-center gap-2 p-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search prompts, tags, notes…"
            className="input-base pl-9"
          />
        </div>
        <select value={source} onChange={(e) => setSource(e.target.value as typeof SOURCES[number])} className="input-base !w-auto">
          {SOURCES.map((s) => <option key={s} value={s}>{s === 'all' ? 'All sources' : s}</option>)}
        </select>
        <button
          onClick={() => setFavOnly(!favOnly)}
          className={cn('btn-ghost', favOnly && 'border-accent text-accent')}
        >
          <Heart className={cn('h-4 w-4', favOnly && 'fill-current')} /> Favorites
        </button>
        <input
          ref={fileInput} type="file" accept="image/*" multiple hidden
          onChange={(e) => { handleUpload(e.target.files); e.target.value = ''; }}
        />
        <button onClick={() => fileInput.current?.click()} className="btn-primary">
          <Upload className="h-4 w-4" /> Upload
        </button>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <p className="card p-8 text-center text-sm text-muted">No images match these filters.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((img) => (
            <button
              key={img.id}
              onClick={() => setSelected(img)}
              className="group relative aspect-[3/4] overflow-hidden rounded-md bg-elevated border border-border hover:border-muted transition-all"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={toPublic(img.filePath)} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                <p className="text-[10px] text-white/80 truncate">{img.prompt || 'uploaded'}</p>
              </div>
              {img.isFavorite && (
                <Heart className="absolute right-2 top-2 h-4 w-4 fill-accent text-accent drop-shadow-md" />
              )}
              <span className="absolute left-2 top-2 rounded-full bg-black/50 px-2 py-0.5 text-[10px] text-white/90 backdrop-blur">
                {img.source}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in" onClick={() => setSelected(null)}>
          <div className="relative max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-lg bg-surface border border-border grid lg:grid-cols-[1.4fr_1fr]" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setSelected(null)} className="absolute right-3 top-3 z-10 btn-icon">
              <X className="h-4 w-4" />
            </button>
            <div className="bg-bg flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={toPublic(selected.filePath)} alt="" className="max-h-[90vh] w-full object-contain" />
            </div>
            <div className="space-y-4 overflow-y-auto p-6">
              <div className="flex items-center gap-2">
                <span className="pill pill-accent">{selected.source}</span>
                {selected.model && <span className="pill">{selected.model}</span>}
                {selected.seed && <span className="pill">seed {selected.seed}</span>}
              </div>

              {selected.prompt && (
                <div>
                  <div className="flex items-center justify-between">
                    <p className="label-tiny">Prompt</p>
                    <button onClick={() => { navigator.clipboard.writeText(selected.prompt!); toast.success('Copied'); }} className="btn-icon h-7 w-7">
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>
                  <p className="mt-1 rounded bg-bg p-3 text-xs font-mono leading-relaxed">{selected.prompt}</p>
                </div>
              )}

              {(selected.tags || []).length > 0 && (
                <div>
                  <p className="label-tiny mb-1.5">Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(selected.tags || []).map((t) => <span key={t} className="pill">{t}</span>)}
                  </div>
                </div>
              )}

              {selected.notes && (
                <div>
                  <p className="label-tiny">Notes</p>
                  <p className="mt-1 text-sm text-muted">{selected.notes}</p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button onClick={() => toggleFavorite(selected)} className={cn('btn-ghost', selected.isFavorite && 'text-accent')}>
                  <Heart className={cn('h-4 w-4', selected.isFavorite && 'fill-current')} />
                  {selected.isFavorite ? 'Favorited' : 'Favorite'}
                </button>
                <button onClick={() => deleteImage(selected)} className="btn-ghost text-danger hover:text-danger ml-auto">
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function toPublic(p: string): string {
  if (p.startsWith('/storage/')) return p;
  // Convert absolute path to /storage/...
  const idx = p.indexOf('/storage/');
  return idx >= 0 ? p.slice(idx) : p;
}
