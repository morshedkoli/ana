'use client';

import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { Upload, Link as LinkIcon, Scissors, RefreshCw, Plus, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Frame {
  id: string;
  publicPath: string;
  timestampSec: number;
}

const REF_TYPES = ['pose', 'outfit', 'lighting', 'composition', 'expression'] as const;

export function FrameExtractor() {
  const [mode, setMode] = useState<'url' | 'upload'>('url');
  const [url, setUrl] = useState('');
  const [everySec, setEverySec] = useState(2);
  const [maxFrames, setMaxFrames] = useState(20);
  const [loading, setLoading] = useState(false);
  const [frames, setFrames] = useState<Frame[]>([]);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const fileInput = useRef<HTMLInputElement>(null);

  async function extractFromUrl() {
    if (!url.trim()) { toast.error('Paste a URL'); return; }
    setLoading(true); setFrames([]); setSaved(new Set());
    try {
      const res = await fetch('/api/extract-frames', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, everySec, maxFrames }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setFrames(data.frames);
      toast.success(`Extracted ${data.frames.length} frames`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    } finally { setLoading(false); }
  }

  async function extractFromFile(file: File) {
    setLoading(true); setFrames([]); setSaved(new Set());
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('everySec', String(everySec));
      fd.append('maxFrames', String(maxFrames));
      const res = await fetch('/api/extract-frames', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setFrames(data.frames);
      toast.success(`Extracted ${data.frames.length} frames`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    } finally { setLoading(false); }
  }

  async function saveFrame(frame: Frame, refType: typeof REF_TYPES[number]) {
    const res = await fetch('/api/extract-frames/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ frameId: frame.id, referenceType: refType, tags: [refType] }),
    });
    if (res.ok) {
      setSaved((p) => new Set(p).add(frame.id));
      toast.success(`Saved as ${refType} reference`);
    } else toast.error('Save failed');
  }

  return (
    <div className="space-y-6">
      <div className="card p-5 space-y-4">
        <div className="flex gap-2">
          <button onClick={() => setMode('url')}
            className={cn('btn-ghost', mode === 'url' && 'border-accent text-accent')}>
            <LinkIcon className="h-4 w-4" /> From URL
          </button>
          <button onClick={() => setMode('upload')}
            className={cn('btn-ghost', mode === 'upload' && 'border-accent text-accent')}>
            <Upload className="h-4 w-4" /> Upload file
          </button>
        </div>

        {mode === 'url' ? (
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="TikTok / YouTube / Instagram URL"
            className="input-base"
          />
        ) : (
          <>
            <input ref={fileInput} type="file" accept="video/*" hidden
              onChange={(e) => { if (e.target.files?.[0]) extractFromFile(e.target.files[0]); }} />
            <button onClick={() => fileInput.current?.click()} className="btn-ghost w-full py-8 border-dashed">
              <Upload className="h-5 w-5" /> Choose video file
            </button>
          </>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-tiny">Extract every {everySec}s</label>
            <input type="range" min={0.5} max={10} step={0.5} value={everySec}
              onChange={(e) => setEverySec(parseFloat(e.target.value))} className="mt-2 w-full" />
          </div>
          <div>
            <label className="label-tiny">Max frames: {maxFrames}</label>
            <input type="range" min={5} max={60} step={5} value={maxFrames}
              onChange={(e) => setMaxFrames(parseInt(e.target.value))} className="mt-2 w-full" />
          </div>
        </div>

        {mode === 'url' && (
          <button onClick={extractFromUrl} disabled={loading} className="btn-primary w-full">
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Scissors className="h-4 w-4" />}
            Extract frames
          </button>
        )}
      </div>

      {/* Frames */}
      {frames.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-display text-2xl">Frames ({frames.length})</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {frames.map((f) => (
              <div key={f.id} className="card group overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.publicPath} alt="" className="aspect-[9/16] w-full object-cover" />
                <div className="p-2">
                  <p className="text-[10px] text-muted">@ {f.timestampSec.toFixed(1)}s</p>
                  {saved.has(f.id) ? (
                    <div className="mt-1.5 flex items-center justify-center gap-1 rounded bg-success/15 py-1 text-xs text-success">
                      <Check className="h-3 w-3" /> Saved
                    </div>
                  ) : (
                    <div className="mt-1.5 grid grid-cols-2 gap-1">
                      {REF_TYPES.slice(0, 4).map((rt) => (
                        <button key={rt} onClick={() => saveFrame(f, rt)}
                          className="rounded bg-elevated px-1 py-0.5 text-[10px] text-muted hover:text-ink hover:bg-surface">
                          +{rt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading && frames.length === 0 && (
        <div className="card p-12 text-center text-muted">
          <RefreshCw className="mx-auto mb-2 h-6 w-6 animate-spin" />
          <p className="text-sm">Downloading + extracting…</p>
        </div>
      )}
    </div>
  );
}
