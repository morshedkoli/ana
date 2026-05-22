'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import type { Image } from '@/lib/db/schema';
import {
  Upload, Search, Heart, Trash2, X, Copy, Settings, Cloud, RefreshCw, ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn, toDisplayUrl } from '@/lib/utils';
import { HostConfigureModal } from '@/components/shared/host-configure-modal';

const SOURCES = ['all', 'cloudflare', 'pollinations', 'huggingface', 'upload', 'extracted'] as const;

interface RemoteImageLite {
  url: string;
  remoteId: string;
  thumbnailUrl?: string;
  bytes?: number;
  createdAt?: string;
  width?: number;
  height?: number;
}

interface HostLite {
  id: string;
  name: string;
  configured: boolean;
  capabilities: { upload: boolean; delete: boolean; listRemote: boolean };
  requiresKey: boolean;
}

export function LibraryGrid({ images: initial }: { images: Image[] }) {
  const [imgs, setImgs] = useState(initial);
  const [search, setSearch] = useState('');
  const [source, setSource] = useState<(typeof SOURCES)[number]>('all');
  const [favOnly, setFavOnly] = useState(false);
  const [selected, setSelected] = useState<Image | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // Hosts state
  const [hosts, setHosts] = useState<HostLite[]>([]);
  const [defaultHost, setDefaultHost] = useState('local');
  const [uploadHost, setUploadHost] = useState<string>('');
  const [configureOpen, setConfigureOpen] = useState(false);

  // Tab state — Local library vs Cloud browser
  const [tab, setTab] = useState<'library' | 'cloud'>('library');
  const [cloudProvider, setCloudProvider] = useState<string>('');
  const [cloudImages, setCloudImages] = useState<RemoteImageLite[]>([]);
  const [cloudLoading, setCloudLoading] = useState(false);

  async function loadHosts() {
    const r = await fetch('/api/image-hosts');
    const data = await r.json();
    setHosts(data.hosts || []);
    setDefaultHost(data.defaultHost || 'local');
    setUploadHost((prev) => prev || data.defaultHost || 'local');

    // Pre-select the first remote-browse-capable provider for the cloud tab
    const browsable = (data.hosts || []).find(
      (h: HostLite) => h.capabilities.listRemote && h.configured
    );
    if (browsable && !cloudProvider) setCloudProvider(browsable.id);
  }

  useEffect(() => { loadHosts(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
    const target = uploadHost || defaultHost || 'local';
    const targetName = hosts.find((h) => h.id === target)?.name || target;
    toast.info(`Uploading ${files.length} → ${targetName}…`);
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('host', target);
      const res = await fetch('/api/images', { method: 'POST', body: fd });
      if (res.ok) {
        const data = await res.json();
        setImgs((prev) => [
          {
            ...(data as Image),
            filePath: data.publicPath,
            remoteUrl: data.remoteUrl ?? null,
            hostProvider: data.hostProvider ?? target,
            createdAt: new Date().toISOString(),
          } as Image,
          ...prev,
        ]);
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(`Upload failed: ${err.error || file.name}`);
      }
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
    if (!confirm('Delete this image (also from cloud host if applicable)?')) return;
    setImgs((prev) => prev.filter((i) => i.id !== img.id));
    setSelected(null);
    await fetch(`/api/images/${img.id}`, { method: 'DELETE' });
    toast.success('Deleted');
  }

  async function loadCloud(provider: string) {
    if (!provider) return;
    setCloudLoading(true);
    try {
      const r = await fetch(`/api/image-hosts/${provider}/remote?limit=60`);
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Failed');
      setCloudImages(data.images || []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
      setCloudImages([]);
    } finally {
      setCloudLoading(false);
    }
  }

  useEffect(() => {
    if (tab === 'cloud' && cloudProvider) loadCloud(cloudProvider);
  }, [tab, cloudProvider]);

  const browsableHosts = hosts.filter((h) => h.capabilities.listRemote && h.configured);
  const uploadableHosts = hosts.filter((h) => h.capabilities.upload && (h.configured || !h.requiresKey));
  const defaultHostName = hosts.find((h) => h.id === defaultHost)?.name || 'Local';

  return (
    <>
      {/* Tabs */}
      <div className="flex flex-wrap items-center border-b border-border/60">
        <div className="flex flex-1 min-w-0 overflow-x-auto -mb-px">
          <TabButton active={tab === 'library'} onClick={() => setTab('library')}>
            Library ({imgs.length})
          </TabButton>
          <TabButton active={tab === 'cloud'} onClick={() => setTab('cloud')}>
            <Cloud className="inline h-3.5 w-3.5 mr-1" />
            Cloud
          </TabButton>
        </div>
        <button onClick={() => setConfigureOpen(true)} className="btn-ghost ml-auto mb-2">
          <Settings className="h-3.5 w-3.5" /> Configure hosts
        </button>
      </div>

      {tab === 'library' ? (
        <>
          {/* Toolbar */}
          <div className="card grid grid-cols-2 gap-2 p-3 sm:flex sm:flex-wrap sm:items-center">
            <div className="relative col-span-2 flex-1 sm:min-w-[200px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search prompts, tags, notes…"
                className="input-base pl-9"
              />
            </div>
            <select value={source} onChange={(e) => setSource(e.target.value as typeof SOURCES[number])} className="input-base sm:!w-auto">
              {SOURCES.map((s) => <option key={s} value={s}>{s === 'all' ? 'All sources' : s}</option>)}
            </select>
            <button
              onClick={() => setFavOnly(!favOnly)}
              className={cn('btn-ghost', favOnly && 'border-accent text-accent')}
            >
              <Heart className={cn('h-4 w-4', favOnly && 'fill-current')} /> Favorites
            </button>
            <select
              value={uploadHost}
              onChange={(e) => setUploadHost(e.target.value)}
              className="input-base sm:!w-auto"
              title="Upload destination"
            >
              {uploadableHosts.length === 0 && <option value="local">Local</option>}
              {uploadableHosts.map((h) => (
                <option key={h.id} value={h.id}>
                  → {h.name}{h.id === defaultHost ? ' ★' : ''}
                </option>
              ))}
            </select>
            <input
              ref={fileInput} type="file" accept="image/*" multiple hidden
              onChange={(e) => { handleUpload(e.target.files); e.target.value = ''; }}
            />
            <button
              onClick={() => fileInput.current?.click()}
              className="btn-primary col-span-2 sm:col-span-1"
            >
              <Upload className="h-4 w-4" /> Upload
            </button>
          </div>

          {/* Default host hint */}
          <p className="text-xs text-muted">
            Uploads go to <span className="text-ink font-medium">{hosts.find((h) => h.id === uploadHost)?.name || defaultHostName}</span>.
            <button
              onClick={() => setConfigureOpen(true)}
              className="ml-1 text-accent underline-offset-4 hover:underline"
            >
              Change defaults
            </button>
          </p>

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
                  <img
                    src={toDisplayUrl(img.remoteUrl || img.filePath)}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <p className="text-[10px] text-white/80 truncate">{img.prompt || 'uploaded'}</p>
                  </div>
                  {img.isFavorite && (
                    <Heart className="absolute right-2 top-2 h-4 w-4 fill-accent text-accent drop-shadow-md" />
                  )}
                  <span className="absolute left-2 top-2 rounded-full bg-black/50 px-2 py-0.5 text-[10px] text-white/90 backdrop-blur">
                    {img.source}
                  </span>
                  {img.hostProvider && img.hostProvider !== 'local' && (
                    <span className="absolute right-2 bottom-2 inline-flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-[10px] text-white/90 backdrop-blur">
                      <Cloud className="h-2.5 w-2.5" />
                      {img.hostProvider}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        /* Cloud tab */
        <div className="space-y-4">
          {browsableHosts.length === 0 ? (
            <div className="card p-8 text-center text-sm text-muted">
              <Cloud className="mx-auto mb-2 h-6 w-6" />
              <p>No connected providers support remote browsing.</p>
              <p className="mt-1">Cloudinary supports it out of the box.</p>
              <button onClick={() => setConfigureOpen(true)} className="btn-primary mt-4">
                <Settings className="h-3.5 w-3.5" /> Configure hosts
              </button>
            </div>
          ) : (
            <>
              <div className="card flex flex-wrap items-center gap-2 p-3">
                <select
                  value={cloudProvider}
                  onChange={(e) => setCloudProvider(e.target.value)}
                  className="input-base sm:!w-auto"
                >
                  {browsableHosts.map((h) => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
                <button
                  onClick={() => loadCloud(cloudProvider)}
                  disabled={cloudLoading}
                  className="btn-ghost"
                >
                  <RefreshCw className={cn('h-4 w-4', cloudLoading && 'animate-spin')} />
                  Refresh
                </button>
                <span className="text-xs text-muted ml-auto">
                  {cloudImages.length} images
                </span>
              </div>

              {cloudLoading && cloudImages.length === 0 ? (
                <div className="card p-8 text-center text-muted">
                  <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin" />
                  Fetching from {cloudProvider}…
                </div>
              ) : cloudImages.length === 0 ? (
                <div className="card p-8 text-center text-sm text-muted">
                  No remote images yet. Upload some from the Library tab.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {cloudImages.map((img) => (
                    <a
                      key={img.remoteId}
                      href={img.url}
                      target="_blank" rel="noreferrer"
                      className="group relative aspect-[3/4] overflow-hidden rounded-md bg-elevated border border-border hover:border-muted transition-all"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.thumbnailUrl || img.url}
                        alt=""
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                        <p className="text-[10px] text-white/80 truncate">{img.remoteId}</p>
                        {img.bytes && (
                          <p className="text-[9px] text-white/60">{(img.bytes / 1024).toFixed(0)} KB</p>
                        )}
                      </div>
                      <ExternalLink className="absolute right-2 top-2 h-3.5 w-3.5 text-white/80 drop-shadow opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 sm:p-4 backdrop-blur-sm animate-fade-in" onClick={() => setSelected(null)}>
          <div className="relative max-h-[95vh] w-full max-w-5xl overflow-hidden rounded-lg bg-surface border border-border flex flex-col lg:grid lg:grid-cols-[1.4fr_1fr]" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setSelected(null)} className="absolute right-3 top-3 z-10 btn-icon">
              <X className="h-4 w-4" />
            </button>
            <div className="bg-bg flex items-center justify-center max-h-[50vh] lg:max-h-none">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={toDisplayUrl(selected.remoteUrl || selected.filePath)}
                alt=""
                className="max-h-[50vh] lg:max-h-[90vh] w-full object-contain"
              />
            </div>
            <div className="space-y-4 overflow-y-auto p-4 sm:p-6">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="pill pill-accent">{selected.source}</span>
                {selected.model && <span className="pill">{selected.model}</span>}
                {selected.seed && <span className="pill">seed {selected.seed}</span>}
                {selected.hostProvider && (
                  <span className={cn('pill', selected.hostProvider !== 'local' ? 'pill-accent' : '')}>
                    <Cloud className="h-3 w-3" /> {selected.hostProvider}
                  </span>
                )}
              </div>

              {selected.remoteUrl && (
                <div>
                  <p className="label-tiny">Hosted URL</p>
                  <div className="flex gap-1 mt-1.5">
                    <input
                      readOnly
                      value={selected.remoteUrl}
                      className="input-base font-mono text-[11px]"
                    />
                    <button
                      onClick={() => { navigator.clipboard.writeText(selected.remoteUrl!); toast.success('Copied'); }}
                      className="btn-icon shrink-0"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              )}

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

      <HostConfigureModal
        open={configureOpen}
        onClose={() => setConfigureOpen(false)}
        onChanged={loadHosts}
      />
    </>
  );
}

function TabButton({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative whitespace-nowrap px-3 sm:px-4 py-2.5 text-sm font-medium transition-colors',
        active ? 'text-ink' : 'text-muted hover:text-ink'
      )}
    >
      {children}
      {active && <div className="absolute bottom-0 left-0 right-0 h-px bg-accent" />}
    </button>
  );
}
