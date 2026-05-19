'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Sparkles, Wand2, Copy, RefreshCw } from 'lucide-react';
import type { Character, Prompt } from '@/lib/db/schema';

interface VisualTraits {
  face?: string; hair?: string; eyes?: string;
  skinTone?: string; body?: string; signatureTraits?: string[];
}

const PRESETS = [
  { name: 'Cafe portrait', tail: 'sitting at a cozy Dhaka café, warm afternoon light, candid expression, shallow depth of field, 50mm' },
  { name: 'Outdoor casual', tail: 'walking on a Dhaka street, golden hour, candid, photojournalism style' },
  { name: 'Bedroom selfie', tail: 'bedroom mirror selfie, soft natural light, casual outfit, vlogger aesthetic' },
  { name: 'Formal saree', tail: 'wearing a traditional Bangladeshi saree, festive setting, soft warm lighting' },
  { name: 'Studio talking head', tail: 'studio lighting, looking at camera, neutral background, ready for talking video' },
  { name: 'Dance pose', tail: 'full body, dynamic dance pose, dramatic lighting, contemporary outfit, motion blur' },
];

const RATIOS = [
  { label: '9:16 (TikTok)', w: 768, h: 1344 },
  { label: '1:1 (Square)', w: 1024, h: 1024 },
  { label: '4:5 (Portrait)', w: 896, h: 1152 },
  { label: '16:9 (Landscape)', w: 1344, h: 768 },
];

export function GeneratePanel({
  character, recentPrompts,
}: { character?: Character; recentPrompts: Prompt[] }) {
  const visual = (character?.visualTraits as VisualTraits) || {};

  const [prompt, setPrompt] = useState('');
  const [provider, setProvider] = useState<'auto' | 'cloudflare' | 'pollinations'>('auto');
  const [ratio, setRatio] = useState(RATIOS[0]);
  const [useCharacterTraits, setUseCharacterTraits] = useState(true);
  const [result, setResult] = useState<{ publicPath: string; seed: number; model: string; provider: string; id: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const characterPrefix = useCharacterTraits ? buildCharacterPrefix(character?.name, visual) : '';
  const finalPrompt = characterPrefix ? `${characterPrefix}, ${prompt}` : prompt;

  async function generate() {
    if (!prompt.trim()) { toast.error('Write a prompt'); return; }
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: finalPrompt,
          provider,
          width: ratio.w,
          height: ratio.h,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
      toast.success(`Generated via ${data.provider}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Generation failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      {/* Left: form */}
      <div className="space-y-4">
        <div className="card p-5 space-y-4">
          <div>
            <label className="label-tiny">Prompt</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="What scene? e.g. 'sitting at a Dhaka café, warm afternoon light, smiling at camera'"
              className="input-base mt-1.5 min-h-32"
              rows={5}
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            <span className="label-tiny mr-1 self-center">Presets:</span>
            {PRESETS.map((p) => (
              <button
                key={p.name}
                onClick={() => setPrompt(p.tail)}
                className="rounded-full bg-elevated border border-border px-2.5 py-1 text-xs text-muted hover:text-ink hover:border-muted/60 transition-colors"
              >
                {p.name}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={useCharacterTraits} onChange={(e) => setUseCharacterTraits(e.target.checked)} />
            <span>Prepend character traits</span>
            <span className="text-xs text-muted">(keeps face consistent)</span>
          </label>

          {useCharacterTraits && characterPrefix && (
            <div className="rounded bg-bg p-3 text-xs font-mono text-muted">
              <p className="label-tiny mb-1 text-accent">Auto prefix:</p>
              {characterPrefix}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-tiny">Provider</label>
              <select value={provider} onChange={(e) => setProvider(e.target.value as typeof provider)} className="input-base mt-1.5">
                <option value="auto">Auto (Cloudflare → Pollinations)</option>
                <option value="cloudflare">Cloudflare (Flux)</option>
                <option value="pollinations">Pollinations (unlimited)</option>
              </select>
            </div>
            <div>
              <label className="label-tiny">Aspect</label>
              <select
                value={ratio.label}
                onChange={(e) => setRatio(RATIOS.find(r => r.label === e.target.value)!)}
                className="input-base mt-1.5"
              >
                {RATIOS.map(r => <option key={r.label} value={r.label}>{r.label}</option>)}
              </select>
            </div>
          </div>

          <button onClick={generate} disabled={loading} className="btn-primary w-full">
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? 'Generating…' : 'Generate'}
          </button>
        </div>

        {recentPrompts.length > 0 && (
          <div className="card p-5">
            <p className="label-tiny mb-3">Recent prompts</p>
            <ul className="space-y-2">
              {recentPrompts.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => setPrompt(p.promptText)}
                    className="w-full rounded bg-elevated p-2 text-left text-xs text-muted hover:text-ink transition-colors"
                  >
                    {p.promptText}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Right: result */}
      <div className="card p-5 flex flex-col">
        <p className="label-tiny mb-3">Result</p>
        <div className="relative flex flex-1 items-center justify-center rounded-md bg-bg overflow-hidden min-h-[400px]">
          {loading && (
            <div className="flex flex-col items-center gap-3 text-muted">
              <div className="h-12 w-12 animate-spin rounded-full border-2 border-accent border-t-transparent" />
              <p className="text-sm">Painting…</p>
            </div>
          )}
          {!loading && result && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={result.publicPath} alt="" className="max-h-[600px] object-contain animate-slide-up" />
          )}
          {!loading && !result && (
            <div className="text-center text-muted">
              <Wand2 className="mx-auto h-8 w-8 mb-2" />
              <p className="text-sm">Your image will appear here</p>
            </div>
          )}
        </div>

        {result && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="pill pill-accent">{result.provider}</span>
            <span className="pill">{result.model}</span>
            <span className="pill">seed {result.seed}</span>
            <button onClick={() => navigator.clipboard.writeText(String(result.seed))} className="btn-icon ml-auto">
              <Copy className="h-3 w-3" />
            </button>
            <a href={result.publicPath} download className="btn-ghost">Download</a>
            <a href="/library" className="btn-ghost">Library →</a>
          </div>
        )}
      </div>
    </div>
  );
}

function buildCharacterPrefix(name?: string, v?: VisualTraits): string {
  if (!v) return '';
  const bits = [
    `Portrait of ${name || 'a young Bengali woman'}`,
    v.face, v.hair, v.eyes, v.skinTone, v.body,
    ...(v.signatureTraits || []),
  ].filter(Boolean);
  return bits.join(', ');
}
