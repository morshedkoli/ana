'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Mic, Play, RefreshCw, Save, Settings, Check, KeyRound,
  Eye, EyeOff, Trash2, ExternalLink, X, Star, Languages,
} from 'lucide-react';
import type { AudioClip, Character } from '@/lib/db/schema';
import { cn, formatDuration, formatRelative, toDisplayUrl } from '@/lib/utils';

const SAMPLE_LINES = [
  { lang: 'bn', text: 'হ্যালো গাইজ, কেমন আছো তোমরা?' },
  { lang: 'bn', text: 'আজকে তোমাদের সাথে শেয়ার করব আমার একটা মজার গল্প।' },
  { lang: 'bn', text: 'ঢাকার এই গরমে আমার অবস্থা খুব খারাপ!' },
  { lang: 'bn', text: 'এই ভিডিওটা ভালো লাগলে লাইক আর ফলো করতে ভুলো না।' },
  { lang: 'en', text: 'Hey guys, this is a quick demo of the voice lab.' },
  { lang: 'en', text: 'If you liked this video, hit follow for more.' },
];

interface EngineInfo {
  id: string;
  name: string;
  description: string;
  homepageUrl: string;
  keysHelp?: string;
  requiresKey: boolean;
  supportsBangla?: boolean;
  freeTier?: string;
  maxChars?: number;
  configured: boolean;
  hasKey: boolean;
}

interface VoiceInfo {
  id: string;
  label: string;
  language?: string;
  gender?: 'male' | 'female' | 'neutral';
  region?: string;
  provider: string;
  previewUrl?: string;
}

export function VoiceLab({ character, recent }: { character?: Character; recent: AudioClip[] }) {
  const voiceProfile = (character?.voiceProfile as {
    engine?: string; voiceId?: string; rate?: number; pitch?: number;
  }) || {};

  // Engines + voices state
  const [engines, setEngines] = useState<EngineInfo[]>([]);
  const [defaultEngine, setDefaultEngine] = useState('edge');
  const [engine, setEngine] = useState(voiceProfile.engine || 'edge');
  const [voices, setVoices] = useState<VoiceInfo[]>([]);
  const [loadingVoices, setLoadingVoices] = useState(false);

  const [voice, setVoice] = useState(voiceProfile.voiceId || '');
  const [rate, setRate] = useState(voiceProfile.rate ?? 1.0);
  const [pitch, setPitch] = useState(voiceProfile.pitch ?? 0);
  const [text, setText] = useState('');
  const [langFilter, setLangFilter] = useState<string>('all');
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female' | 'neutral'>('all');

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ publicPath: string; durationSec: number; engine: string } | null>(null);
  const [clips, setClips] = useState(recent);
  const [configureOpen, setConfigureOpen] = useState(false);

  async function loadEngines() {
    const r = await fetch('/api/tts/engines');
    const data = await r.json();
    setEngines(data.engines || []);
    setDefaultEngine(data.defaultEngine || 'edge');
    if (!engine) setEngine(voiceProfile.engine || data.defaultEngine || 'edge');
  }

  async function loadVoices(id: string) {
    if (!id) return;
    setLoadingVoices(true);
    try {
      const r = await fetch(`/api/tts/engines/${id}/voices`);
      const data = await r.json();
      setVoices(data.voices || []);
      // Pick a sensible default voice if current one isn't in this engine's list
      if (data.voices?.length > 0) {
        const current = (data.voices as VoiceInfo[]).find((v) => v.id === voice);
        if (!current) {
          // For Bangla-supporting engines, prefer a Bangla voice
          const bn = (data.voices as VoiceInfo[]).find((v) => v.language?.startsWith('bn'));
          setVoice(bn ? bn.id : data.voices[0].id);
        }
      } else {
        setVoice('');
      }
    } finally {
      setLoadingVoices(false);
    }
  }

  useEffect(() => { loadEngines(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (engine) loadVoices(engine); }, [engine]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentEngine = engines.find((e) => e.id === engine);

  // Languages present in this engine's voice list (for the filter chips)
  const languages = useMemo(() => {
    const set = new Set<string>();
    voices.forEach((v) => v.language && set.add(v.language.split('-')[0]));
    return Array.from(set).sort();
  }, [voices]);

  const filteredVoices = useMemo(() => voices.filter((v) => {
    if (langFilter !== 'all' && !v.language?.startsWith(langFilter)) return false;
    if (genderFilter !== 'all' && v.gender !== genderFilter) return false;
    return true;
  }), [voices, langFilter, genderFilter]);

  const supportsRatePitch = engine === 'edge';

  async function generate(save: boolean) {
    if (!text.trim()) { toast.error('Write some text first'); return; }
    if (currentEngine?.requiresKey && !currentEngine.configured) {
      toast.error(`${currentEngine.name} needs an API key. Click Configure.`);
      return;
    }
    setLoading(true);
    try {
      const r = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ engine, text, voice, rate, pitch, save }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'TTS failed');
      setResult(data);
      if (save) {
        toast.success('Saved to library');
        setClips((prev) => [{
          id: String(Date.now()), characterId: character?.id ?? null,
          filePath: data.publicPath, transcript: text,
          language: voices.find((v) => v.id === voice)?.language || null,
          voiceEngine: engine, voiceId: voice,
          rate, pitch, durationSec: data.durationSec,
          createdAt: new Date().toISOString(),
        } as AudioClip, ...prev]);
      } else {
        toast.success(`Generated via ${engine}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'TTS failed');
    } finally {
      setLoading(false);
    }
  }

  function playClip(url: string) {
    const a = new Audio(toDisplayUrl(url));
    a.play();
  }

  const charLimit = currentEngine?.maxChars ?? 0;
  const overLimit = charLimit > 0 && text.length > charLimit;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      {/* Left: generator */}
      <div className="space-y-4">
        {/* Engine bar */}
        <div className="card flex flex-wrap items-center gap-2 p-3">
          <label className="label-tiny shrink-0">Engine</label>
          <select
            value={engine}
            onChange={(e) => setEngine(e.target.value)}
            className="input-base sm:!w-auto flex-1"
          >
            {engines.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
                {e.id === defaultEngine ? ' ★' : ''}
                {e.requiresKey ? (e.configured ? ' ✓' : ' · no key') : ''}
              </option>
            ))}
          </select>
          <button
            onClick={() => setConfigureOpen(true)}
            className="btn-ghost"
            title="Manage TTS engines & keys"
          >
            <Settings className="h-3.5 w-3.5" /> Configure
          </button>
        </div>

        {currentEngine && (
          <p className="text-xs text-muted -mt-2">
            <span className="text-ink font-medium">{currentEngine.name}</span> · {currentEngine.description}
            {currentEngine.freeTier && <> · <span className="text-accent">{currentEngine.freeTier}</span></>}
          </p>
        )}

        {currentEngine?.requiresKey && !currentEngine.configured && (
          <div className="card border-amber/40 bg-amber/10 p-3 text-xs text-amber flex items-center gap-2">
            <KeyRound className="h-4 w-4 shrink-0" />
            <span className="flex-1">{currentEngine.name} needs an API key.</span>
            <button onClick={() => setConfigureOpen(true)} className="text-ink hover:underline">
              Add key →
            </button>
          </div>
        )}

        <div className="card p-5 space-y-4">
          <div>
            <label className="label-tiny">Text</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={engine === 'streamelements' || engine === 'pollinations'
                ? 'Type some English text…'
                : 'বাংলায় এখানে লিখো বা type any language…'}
              className="input-base bangla mt-1.5 min-h-40 text-base"
              rows={6}
            />
            <p className={cn('mt-1.5 text-xs', overLimit ? 'text-danger' : 'text-muted')}>
              {text.length} characters
              {charLimit > 0 && ` · max ${charLimit.toLocaleString()}`}
              {!overLimit && <> · approx {formatDuration(text.length / 14)} duration</>}
              {overLimit && ' · over engine limit, will be trimmed or fail'}
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <span className="label-tiny mr-1 self-center">Quick lines:</span>
            {SAMPLE_LINES.map((line, i) => (
              <button
                key={i}
                onClick={() => setText(line.text)}
                className={cn(
                  'rounded-full bg-elevated border border-border px-2.5 py-1 text-xs text-muted hover:text-ink',
                  line.lang === 'bn' && 'bangla'
                )}
                lang={line.lang}
              >
                {line.text.slice(0, 22)}…
              </button>
            ))}
          </div>

          {/* Voice filters + voice picker */}
          {voices.length > 0 && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="label-tiny shrink-0">
                  <Languages className="inline h-3 w-3 mr-1" /> Filter
                </span>
                <select
                  value={langFilter}
                  onChange={(e) => setLangFilter(e.target.value)}
                  className="input-base !py-1 !text-xs sm:!w-auto"
                >
                  <option value="all">All languages</option>
                  {languages.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
                <select
                  value={genderFilter}
                  onChange={(e) => setGenderFilter(e.target.value as typeof genderFilter)}
                  className="input-base !py-1 !text-xs sm:!w-auto"
                >
                  <option value="all">All genders</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="neutral">Neutral</option>
                </select>
                <span className="text-xs text-muted ml-auto">
                  {filteredVoices.length} voice{filteredVoices.length === 1 ? '' : 's'}
                </span>
              </div>
              <div>
                <label className="label-tiny">Voice</label>
                <select
                  value={voice}
                  onChange={(e) => setVoice(e.target.value)}
                  className="input-base mt-1.5"
                  disabled={loadingVoices}
                >
                  {loadingVoices ? (
                    <option>Loading voices…</option>
                  ) : filteredVoices.length === 0 ? (
                    <option value="">— no voices match filter —</option>
                  ) : (
                    filteredVoices.map((v) => (
                      <option key={`${v.provider}-${v.id}`} value={v.id}>
                        {v.label}{v.language ? ` · ${v.language}` : ''}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="label-tiny">Rate ({rate}x){!supportsRatePitch && ' · ignored'}</label>
              <input
                type="range" min={0.5} max={1.5} step={0.05} value={rate}
                onChange={(e) => setRate(parseFloat(e.target.value))}
                className="mt-3 w-full"
                disabled={!supportsRatePitch}
              />
            </div>
            <div>
              <label className="label-tiny">Pitch ({pitch} Hz){!supportsRatePitch && ' · ignored'}</label>
              <input
                type="range" min={-20} max={20} step={1} value={pitch}
                onChange={(e) => setPitch(parseInt(e.target.value))}
                className="mt-3 w-full"
                disabled={!supportsRatePitch}
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <button onClick={() => generate(false)} disabled={loading} className="btn-ghost flex-1">
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Preview
            </button>
            <button onClick={() => generate(true)} disabled={loading} className="btn-primary flex-1">
              <Save className="h-4 w-4" />
              Generate &amp; save
            </button>
          </div>
        </div>

        {result && (
          <div className="card p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="label-tiny">Latest preview</p>
              <span className="pill pill-accent">{result.engine}</span>
            </div>
            <audio src={toDisplayUrl(result.publicPath)} controls className="w-full" />
            <a href={toDisplayUrl(result.publicPath)} download className="btn-ghost mt-1 inline-flex">
              Download
            </a>
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
                    onClick={() => playClip(c.filePath)}
                    className="btn-icon shrink-0"
                  >
                    <Play className="h-3.5 w-3.5" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="bangla text-sm leading-relaxed" lang={c.language || undefined}>
                      {c.transcript}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-muted">
                      <span className="pill text-[9px]">{c.voiceEngine}</span>
                      {c.voiceId && <span>{c.voiceId}</span>}
                      <span>·</span>
                      <span>{formatDuration(c.durationSec || 0)}</span>
                      <span>·</span>
                      <span>{formatRelative(c.createdAt!)}</span>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Configure modal */}
      {configureOpen && (
        <ConfigureModal
          engines={engines}
          defaultEngine={defaultEngine}
          onClose={() => setConfigureOpen(false)}
          onChanged={() => loadEngines()}
        />
      )}
    </div>
  );
}

/* ============================================================
   Configure modal
   ============================================================ */
function ConfigureModal({
  engines, defaultEngine, onClose, onChanged,
}: {
  engines: EngineInfo[];
  defaultEngine: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  async function setDefault(id: string) {
    const r = await fetch('/api/tts/engines/default', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (r.ok) {
      toast.success(`Default: ${engines.find((e) => e.id === id)?.name}`);
      onChanged();
    } else toast.error('Failed');
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 p-2 sm:p-4 backdrop-blur-sm animate-fade-in overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative my-4 w-full max-w-3xl rounded-lg bg-surface border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
          <div>
            <h2 className="font-display text-xl">TTS engines</h2>
            <p className="text-xs text-muted">
              Connect free TTS providers. Default gets a
              <Star className="inline h-3 w-3 mx-1 text-accent fill-current" />.
            </p>
          </div>
          <button onClick={onClose} className="btn-icon">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3 p-5 max-h-[80vh] overflow-y-auto">
          {engines.map((e) => (
            <EngineRow
              key={e.id} engine={e}
              isDefault={defaultEngine === e.id}
              onMakeDefault={() => setDefault(e.id)}
              onChanged={onChanged}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function EngineRow({
  engine, isDefault, onMakeDefault, onChanged,
}: {
  engine: EngineInfo;
  isDefault: boolean;
  onMakeDefault: () => void;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const r = await fetch(`/api/tts/engines/${engine.id}/keys`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      });
      if (!r.ok) throw new Error((await r.json()).error || 'Failed');
      toast.success(`${engine.name} key saved`);
      setEditing(false);
      setApiKey('');
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    } finally { setSaving(false); }
  }

  async function clear() {
    if (!confirm(`Remove ${engine.name} credentials?`)) return;
    const r = await fetch(`/api/tts/engines/${engine.id}/keys`, { method: 'DELETE' });
    if (r.ok) { toast.success('Cleared'); onChanged(); }
    else toast.error('Failed');
  }

  async function test() {
    setTesting(true);
    try {
      const r = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          engine: engine.id,
          text: engine.supportsBangla ? 'হ্যালো, এটা একটা টেস্ট।' : 'Hello, this is a test.',
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Test failed');
      const audio = new Audio(toDisplayUrl(data.publicPath));
      audio.play();
      toast.success(`${engine.name} works! Playing sample.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Test failed');
    } finally { setTesting(false); }
  }

  return (
    <div className={cn('card p-4 space-y-3', isDefault && 'border-accent/50')}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-lg">{engine.name}</h3>
            {isDefault && (
              <span className="pill pill-accent">
                <Star className="h-3 w-3 fill-current" /> default
              </span>
            )}
            {engine.configured ? (
              <span className="pill pill-success"><Check className="h-3 w-3" /> ready</span>
            ) : engine.requiresKey ? (
              <span className="pill pill-amber">needs key</span>
            ) : (
              <span className="pill pill-success"><Check className="h-3 w-3" /> free</span>
            )}
            {engine.supportsBangla && <span className="pill bangla">বাংলা</span>}
          </div>
          <p className="mt-1 text-xs text-muted">{engine.description}</p>
          {engine.freeTier && (
            <p className="mt-1 text-[11px] text-muted">
              <span className="text-accent">Free tier:</span> {engine.freeTier}
            </p>
          )}
        </div>
        {engine.homepageUrl && engine.homepageUrl !== '#' && (
          <a
            href={engine.homepageUrl}
            target="_blank" rel="noreferrer"
            className="btn-icon shrink-0"
            title="Open provider site"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>

      {!editing && (
        <div className="flex flex-wrap gap-2">
          {engine.requiresKey && (
            <button onClick={() => setEditing(true)} className="btn-ghost flex-1 sm:flex-none">
              <KeyRound className="h-3.5 w-3.5" />
              {engine.hasKey ? 'Replace key' : 'Add key'}
            </button>
          )}
          {(engine.configured || !engine.requiresKey) && (
            <button onClick={test} disabled={testing} className="btn-ghost">
              {testing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : 'Test'}
            </button>
          )}
          {!isDefault && engine.configured && (
            <button onClick={onMakeDefault} className="btn-ghost">
              <Star className="h-3.5 w-3.5" /> Make default
            </button>
          )}
          {engine.requiresKey && engine.hasKey && (
            <button onClick={clear} className="btn-icon hover:text-danger" title="Remove credentials">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {editing && (
        <div className="space-y-3 rounded-md bg-elevated p-3 border border-border">
          {engine.keysHelp && <p className="text-xs text-muted">{engine.keysHelp}</p>}
          <div>
            <label className="label-tiny">API key</label>
            <div className="relative mt-1.5">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={engine.hasKey ? '••••••••  (replace existing)' : 'paste key here'}
                className="input-base pr-10 font-mono"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowKey((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
              >
                {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={save} disabled={saving || !apiKey} className="btn-primary flex-1">
              <Save className="h-3.5 w-3.5" /> {saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={() => { setEditing(false); setApiKey(''); }} className="btn-ghost">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
