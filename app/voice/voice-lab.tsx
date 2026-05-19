'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Mic, Play, RefreshCw, Save } from 'lucide-react';
import type { AudioClip, Character } from '@/lib/db/schema';
import { BANGLA_VOICES } from '@/lib/tts/voices';
import { formatDuration, formatRelative } from '@/lib/utils';

const SAMPLE_LINES = [
  'হ্যালো গাইজ, কেমন আছো তোমরা?',
  'আজকে তোমাদের সাথে শেয়ার করব আমার একটা মজার গল্প।',
  'ঢাকার এই গরমে আমার অবস্থা খুব খারাপ!',
  'এই ভিডিওটা ভালো লাগলে লাইক আর ফলো করতে ভুলো না।',
  'কাল আমি কোথায় গেছিলাম জানো? অবাক হবা শুনলে।',
];

export function VoiceLab({ character, recent }: { character?: Character; recent: AudioClip[] }) {
  const voiceProfile = (character?.voiceProfile as { voiceId?: string; rate?: number; pitch?: number }) || {};

  const [text, setText] = useState('');
  const [voice, setVoice] = useState(voiceProfile.voiceId || 'bn-BD-NabanitaNeural');
  const [rate, setRate] = useState(voiceProfile.rate ?? 1.0);
  const [pitch, setPitch] = useState(voiceProfile.pitch ?? 0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ publicPath: string; durationSec: number } | null>(null);
  const [clips, setClips] = useState(recent);

  async function generate(save: boolean) {
    if (!text.trim()) { toast.error('Write Bangla text first'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice, rate, pitch, save }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
      if (save) {
        // Reload list
        toast.success('Saved to library');
        setClips((prev) => [{
          id: Date.now(), characterId: character?.id ?? null,
          filePath: data.publicPath, transcript: text,
          language: 'bn-BD', voiceEngine: 'edge-tts', voiceId: voice,
          rate, pitch, durationSec: data.durationSec,
          createdAt: new Date().toISOString(),
        } as AudioClip, ...prev]);
      } else toast.success('Generated');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'TTS failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  function playClip(url: string) {
    const a = new Audio(url);
    a.play();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      {/* Left: generator */}
      <div className="space-y-4">
        <div className="card p-5 space-y-4">
          <div>
            <label className="label-tiny">Bangla text</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="বাংলায় এখানে লিখো…"
              className="input-base bangla mt-1.5 min-h-40 text-base"
              lang="bn"
              rows={6}
            />
            <p className="mt-1.5 text-xs text-muted">
              {text.length} characters · approx {formatDuration(text.length / 14)} duration
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <span className="label-tiny mr-1 self-center">Quick lines:</span>
            {SAMPLE_LINES.map((line, i) => (
              <button
                key={i}
                onClick={() => setText(line)}
                className="rounded-full bg-elevated border border-border px-2.5 py-1 text-xs bangla text-muted hover:text-ink"
                lang="bn"
              >
                {line.slice(0, 18)}…
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-3 lg:col-span-1">
              <label className="label-tiny">Voice</label>
              <select value={voice} onChange={(e) => setVoice(e.target.value)} className="input-base mt-1.5">
                {BANGLA_VOICES.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label-tiny">Rate ({rate}x)</label>
              <input type="range" min={0.5} max={1.5} step={0.05} value={rate}
                onChange={(e) => setRate(parseFloat(e.target.value))}
                className="mt-3 w-full" />
            </div>
            <div>
              <label className="label-tiny">Pitch ({pitch} Hz)</label>
              <input type="range" min={-20} max={20} step={1} value={pitch}
                onChange={(e) => setPitch(parseInt(e.target.value))}
                className="mt-3 w-full" />
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={() => generate(false)} disabled={loading} className="btn-ghost flex-1">
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Preview
            </button>
            <button onClick={() => generate(true)} disabled={loading} className="btn-primary flex-1">
              <Save className="h-4 w-4" />
              Generate & save
            </button>
          </div>
        </div>

        {result && (
          <div className="card p-4">
            <p className="label-tiny mb-2">Latest preview</p>
            <audio src={result.publicPath} controls className="w-full" />
            <a href={result.publicPath} download className="btn-ghost mt-3 inline-flex">Download MP3</a>
          </div>
        )}
      </div>

      {/* Right: library */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl">Library</h2>
          <span className="text-xs text-muted">{clips.length} clips</span>
        </div>
        {clips.length === 0 ? (
          <div className="card p-6 text-center text-sm text-muted">
            <Mic className="mx-auto mb-2 h-6 w-6" />
            No saved voice clips yet.
          </div>
        ) : (
          <ul className="space-y-2">
            {clips.map((c) => (
              <li key={c.id} className="card p-3">
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => playClip(toPublic(c.filePath))}
                    className="btn-icon shrink-0"
                  >
                    <Play className="h-3.5 w-3.5" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="bangla text-sm leading-relaxed" lang="bn">{c.transcript}</p>
                    <p className="mt-1 text-[10px] text-muted">
                      {c.voiceId} · {formatDuration(c.durationSec || 0)} · {formatRelative(c.createdAt!)}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function toPublic(p: string): string {
  if (p.startsWith('/storage/')) return p;
  const idx = p.indexOf('/storage/');
  return idx >= 0 ? p.slice(idx) : p;
}
