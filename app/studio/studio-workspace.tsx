'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  KeyRound, ExternalLink, Check, X, Eye, EyeOff, Trash2, Save,
  RefreshCw, Sparkles, MessageSquare, Cpu,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface ProviderInfo {
  id: string;
  name: string;
  description: string;
  homepageUrl: string;
  keysHelp?: string;
  requiresKey: boolean;
  requiresAccount?: boolean;
  capabilities: { image?: boolean; text?: boolean };
  configured: boolean;
  hasKey: boolean;
  hasAccount: boolean;
  maskedAccount: string;
}

interface ModelInfo {
  id: string;
  label: string;
  kind: 'image' | 'text';
  provider: string;
  description?: string;
  contextLength?: number;
}

type Tab = 'Providers' | 'Models' | 'Image' | 'Text';
const TABS: Tab[] = ['Providers', 'Models', 'Image', 'Text'];

export function StudioWorkspace({ initialProviders }: { initialProviders: ProviderInfo[] }) {
  const [tab, setTab] = useState<Tab>('Providers');
  const [providers, setProviders] = useState<ProviderInfo[]>(initialProviders);

  async function refreshProviders() {
    const r = await fetch('/api/ai/providers');
    const data = await r.json();
    setProviders(data.providers);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center border-b border-border/60">
        <div className="flex flex-1 min-w-0 overflow-x-auto -mb-px">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'relative whitespace-nowrap px-3 sm:px-4 py-2.5 text-sm font-medium transition-colors',
                tab === t ? 'text-ink' : 'text-muted hover:text-ink'
              )}
            >
              {t}
              {tab === t && <div className="absolute bottom-0 left-0 right-0 h-px bg-accent" />}
            </button>
          ))}
        </div>
      </div>

      {tab === 'Providers' && (
        <ProvidersTab providers={providers} onChange={refreshProviders} />
      )}
      {tab === 'Models' && <ModelsTab providers={providers} />}
      {tab === 'Image' && <ImagePlayground providers={providers} />}
      {tab === 'Text' && <TextPlayground providers={providers} />}
    </div>
  );
}

/* ============================================================
   PROVIDERS TAB
   ============================================================ */
function ProvidersTab({
  providers, onChange,
}: { providers: ProviderInfo[]; onChange: () => void }) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {providers.map((p) => (
        <ProviderCard key={p.id} provider={p} onChange={onChange} />
      ))}
    </div>
  );
}

function ProviderCard({
  provider, onChange,
}: { provider: ProviderInfo; onChange: () => void }) {
  const [editing, setEditing] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [apiAccount, setApiAccount] = useState(provider.maskedAccount || '');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const r = await fetch(`/api/ai/providers/${provider.id}/keys`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, apiAccount }),
      });
      if (!r.ok) throw new Error((await r.json()).error || 'Failed');
      toast.success(`${provider.name} key saved`);
      setEditing(false);
      setApiKey('');
      onChange();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function clear() {
    if (!confirm(`Remove ${provider.name} credentials?`)) return;
    const r = await fetch(`/api/ai/providers/${provider.id}/keys`, { method: 'DELETE' });
    if (r.ok) {
      toast.success('Cleared');
      setApiAccount('');
      onChange();
    } else toast.error('Failed');
  }

  async function test() {
    setTesting(true);
    try {
      const r = await fetch(`/api/ai/providers/${provider.id}/models`);
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      toast.success(`${provider.name}: found ${data.models.length} models`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Test failed');
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="card p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-lg">{provider.name}</h3>
            {provider.configured ? (
              <span className="pill pill-success"><Check className="h-3 w-3" /> connected</span>
            ) : provider.requiresKey ? (
              <span className="pill pill-amber">needs key</span>
            ) : (
              <span className="pill pill-success"><Check className="h-3 w-3" /> free</span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted">{provider.description}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {provider.capabilities.image && <span className="pill"><Sparkles className="h-3 w-3" /> image</span>}
            {provider.capabilities.text && <span className="pill"><MessageSquare className="h-3 w-3" /> text</span>}
          </div>
        </div>
        <a
          href={provider.homepageUrl}
          target="_blank" rel="noreferrer"
          className="btn-icon"
          title="Get a key"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      {provider.requiresKey && !editing && (
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setEditing(true)} className="btn-ghost flex-1">
            <KeyRound className="h-3.5 w-3.5" />
            {provider.hasKey ? 'Replace key' : 'Add key'}
          </button>
          {provider.hasKey && (
            <>
              <button onClick={test} disabled={testing} className="btn-ghost">
                {testing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : 'Test'}
              </button>
              <button onClick={clear} className="btn-icon hover:text-danger" title="Remove credentials">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      )}

      {!provider.requiresKey && (
        <button onClick={test} disabled={testing} className="btn-ghost w-full">
          {testing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : 'Test connection'}
        </button>
      )}

      {editing && (
        <div className="space-y-3 rounded-md bg-elevated p-3 border border-border">
          {provider.keysHelp && (
            <p className="text-xs text-muted">{provider.keysHelp}</p>
          )}
          {provider.requiresAccount && (
            <div>
              <label className="label-tiny">Account ID</label>
              <input
                value={apiAccount}
                onChange={(e) => setApiAccount(e.target.value)}
                placeholder="cloudflare account id"
                className="input-base mt-1.5 font-mono"
              />
            </div>
          )}
          <div>
            <label className="label-tiny">API key</label>
            <div className="relative mt-1.5">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={provider.hasKey ? '••••••••  (replace existing)' : 'paste key here'}
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
              <X className="h-3.5 w-3.5" /> Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   MODELS TAB
   ============================================================ */
function ModelsTab({ providers }: { providers: ProviderInfo[] }) {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'image' | 'text'>('all');
  const [providerFilter, setProviderFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  async function load() {
    setLoading(true);
    try {
      const r = await fetch('/api/ai/models');
      const data = await r.json();
      setModels(data.models || []);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const visible = models.filter((m) => {
    if (filter !== 'all' && m.kind !== filter) return false;
    if (providerFilter !== 'all' && m.provider !== providerFilter) return false;
    if (search && !`${m.id} ${m.label}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const counts = {
    all: models.length,
    image: models.filter((m) => m.kind === 'image').length,
    text: models.filter((m) => m.kind === 'text').length,
  };

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center gap-2 p-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search models…"
          className="input-base flex-1 min-w-[200px]"
        />
        <select value={providerFilter} onChange={(e) => setProviderFilter(e.target.value)} className="input-base sm:!w-auto">
          <option value="all">All providers</option>
          {providers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <button onClick={load} className="btn-ghost">
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} /> Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <FilterPill active={filter === 'all'} onClick={() => setFilter('all')}>
          All ({counts.all})
        </FilterPill>
        <FilterPill active={filter === 'image'} onClick={() => setFilter('image')}>
          Image ({counts.image})
        </FilterPill>
        <FilterPill active={filter === 'text'} onClick={() => setFilter('text')}>
          Text ({counts.text})
        </FilterPill>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-muted">
          <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin" />
          <p className="text-sm">Loading models from every provider…</p>
        </div>
      ) : visible.length === 0 ? (
        <div className="card p-8 text-center text-sm text-muted">
          No models match. Connect more providers in the Providers tab.
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((m) => (
            <div key={`${m.provider}-${m.id}`} className="card p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{m.label}</p>
                  <p className="text-[10px] text-muted truncate font-mono">{m.id}</p>
                </div>
                <span className={cn('pill shrink-0', m.kind === 'image' ? 'pill-accent' : '')}>
                  {m.kind}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[10px] text-muted">
                <span>{providerName(providers, m.provider)}</span>
                {m.contextLength && <span>{(m.contextLength / 1000).toFixed(0)}k ctx</span>}
              </div>
              {m.description && (
                <p className="mt-2 text-[11px] text-muted line-clamp-2">{m.description}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   IMAGE PLAYGROUND
   ============================================================ */
function ImagePlayground({ providers }: { providers: ProviderInfo[] }) {
  const imgProviders = providers.filter((p) => p.capabilities.image);
  const [provider, setProvider] = useState(imgProviders[0]?.id || 'pollinations');
  const [model, setModel] = useState('');
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [prompt, setPrompt] = useState('');
  const [width, setWidth] = useState(1024);
  const [height, setHeight] = useState(1024);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ publicPath: string; provider: string; model: string; seed: number } | null>(null);

  useEffect(() => {
    if (!provider) return;
    fetch(`/api/ai/providers/${provider}/models?kind=image`)
      .then((r) => r.json())
      .then((d) => setModels(d.models || []));
  }, [provider]);

  async function generate() {
    if (!prompt.trim()) { toast.error('Write a prompt'); return; }
    setLoading(true);
    setResult(null);
    try {
      const r = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, provider, model: model || undefined, width, height, savePrompt: false }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setResult(data);
      toast.success('Generated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      <div className="card p-5 space-y-4">
        <div>
          <label className="label-tiny">Prompt</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="describe the image…"
            className="input-base mt-1.5 min-h-32"
            rows={5}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-tiny">Provider</label>
            <select value={provider} onChange={(e) => { setProvider(e.target.value); setModel(''); }} className="input-base mt-1.5">
              {imgProviders.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.configured ? '✓' : (p.requiresKey ? '· no key' : '')}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-tiny">Model</label>
            <select value={model} onChange={(e) => setModel(e.target.value)} className="input-base mt-1.5">
              <option value="">— default —</option>
              {models.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-tiny">Width</label>
            <input type="number" value={width} onChange={(e) => setWidth(parseInt(e.target.value) || 1024)} className="input-base mt-1.5" />
          </div>
          <div>
            <label className="label-tiny">Height</label>
            <input type="number" value={height} onChange={(e) => setHeight(parseInt(e.target.value) || 1024)} className="input-base mt-1.5" />
          </div>
        </div>
        <button onClick={generate} disabled={loading} className="btn-primary w-full">
          {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Generate
        </button>
      </div>

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
            <img src={result.publicPath} alt="" className="max-h-[600px] object-contain" />
          )}
          {!loading && !result && (
            <div className="text-center text-muted">
              <Cpu className="mx-auto h-8 w-8 mb-2" />
              <p className="text-sm">No image yet</p>
            </div>
          )}
        </div>
        {result && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="pill pill-accent">{result.provider}</span>
            <span className="pill">{result.model}</span>
            <span className="pill">seed {result.seed}</span>
            <a href={result.publicPath} download className="btn-ghost ml-auto">Download</a>
            <Link href="/library" className="btn-ghost">Library →</Link>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   TEXT PLAYGROUND
   ============================================================ */
function TextPlayground({ providers }: { providers: ProviderInfo[] }) {
  const txtProviders = providers.filter((p) => p.capabilities.text);
  const [provider, setProvider] = useState(txtProviders.find((p) => p.configured)?.id || txtProviders[0]?.id || 'pollinations');
  const [model, setModel] = useState('');
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [systemPrompt, setSystemPrompt] = useState('You are a helpful assistant for a Bangladeshi AI influencer creator.');
  const [userPrompt, setUserPrompt] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!provider) return;
    fetch(`/api/ai/providers/${provider}/models?kind=text`)
      .then((r) => r.json())
      .then((d) => setModels(d.models || []));
  }, [provider]);

  async function run() {
    if (!userPrompt.trim()) { toast.error('Write a prompt'); return; }
    setLoading(true); setOutput('');
    try {
      const r = await fetch('/api/ai/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider, model: model || undefined, temperature,
          messages: [
            ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
            { role: 'user', content: userPrompt },
          ],
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setOutput(data.text);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      <div className="card p-5 space-y-4">
        <div>
          <label className="label-tiny">System prompt (optional)</label>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            className="input-base mt-1.5 min-h-16"
            rows={2}
          />
        </div>
        <div>
          <label className="label-tiny">Your prompt</label>
          <textarea
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            placeholder="Ask anything…"
            className="input-base mt-1.5 min-h-32"
            rows={6}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-tiny">Provider</label>
            <select value={provider} onChange={(e) => { setProvider(e.target.value); setModel(''); }} className="input-base mt-1.5">
              {txtProviders.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.configured ? '✓' : (p.requiresKey ? '· no key' : '')}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-tiny">Model</label>
            <select value={model} onChange={(e) => setModel(e.target.value)} className="input-base mt-1.5">
              <option value="">— default —</option>
              {models.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="label-tiny">Temperature ({temperature.toFixed(2)})</label>
          <input
            type="range" min={0} max={1.5} step={0.05}
            value={temperature} onChange={(e) => setTemperature(parseFloat(e.target.value))}
            className="mt-2 w-full"
          />
        </div>
        <button onClick={run} disabled={loading} className="btn-primary w-full">
          {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
          Run
        </button>
      </div>

      <div className="card p-5 flex flex-col">
        <div className="flex items-center justify-between">
          <p className="label-tiny">Output</p>
          {output && (
            <button
              onClick={() => { navigator.clipboard.writeText(output); toast.success('Copied'); }}
              className="text-xs text-muted hover:text-ink"
            >
              Copy
            </button>
          )}
        </div>
        <div className="mt-3 flex-1 min-h-[300px] rounded-md bg-bg p-4 text-sm whitespace-pre-wrap leading-relaxed overflow-y-auto">
          {loading && <span className="text-muted">Thinking…</span>}
          {!loading && !output && <span className="text-muted">Output appears here</span>}
          {!loading && output}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   utils
   ============================================================ */
function FilterPill({ active, onClick, children }: {
  active: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
        active ? 'bg-accent border-accent text-accent-fg' : 'bg-elevated border-border text-muted hover:text-ink'
      )}
    >
      {children}
    </button>
  );
}

function providerName(providers: ProviderInfo[], id: string): string {
  return providers.find((p) => p.id === id)?.name || id;
}
