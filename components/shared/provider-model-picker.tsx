'use client';

import { useEffect, useState, useCallback } from 'react';
import { RefreshCw, AlertCircle, KeyRound } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export interface ProviderInfo {
  id: string;
  name: string;
  configured: boolean;
  capabilities: { image?: boolean; text?: boolean };
  requiresKey: boolean;
}

export interface ModelInfo {
  id: string;
  label: string;
  kind: 'image' | 'text';
  provider: string;
  description?: string;
  contextLength?: number;
  free?: boolean;
}

interface Props {
  kind: 'image' | 'text';
  provider: string;
  model: string;
  onChange: (next: { provider: string; model: string }) => void;
  /** Show "Auto" option (image only, valid for image gen). */
  allowAuto?: boolean;
  className?: string;
}

/**
 * Compact two-select (provider + model) that fetches available providers and
 * live models. Reused by Generate, Voice (eventually), and AI Studio playgrounds.
 */
export function ProviderModelPicker({
  kind, provider, model, onChange, allowAuto, className,
}: Props) {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [loadingModels, setLoadingModels] = useState(false);

  // Load providers once
  useEffect(() => {
    let alive = true;
    fetch('/api/ai/providers')
      .then((r) => r.json())
      .then((data) => {
        if (!alive) return;
        const compatible: ProviderInfo[] = (data.providers || []).filter(
          (p: ProviderInfo) => p.capabilities[kind]
        );
        setProviders(compatible);
      })
      .catch(() => { /* ignore */ })
      .finally(() => { if (alive) setLoadingProviders(false); });
    return () => { alive = false; };
  }, [kind]);

  // Load models when provider changes
  const refreshModels = useCallback(async (p: string) => {
    if (!p || p === 'auto') { setModels([]); return; }
    setLoadingModels(true);
    try {
      const r = await fetch(`/api/ai/providers/${p}/models?kind=${kind}`);
      const data = await r.json();
      setModels(data.models || []);
    } catch {
      setModels([]);
    } finally {
      setLoadingModels(false);
    }
  }, [kind]);

  useEffect(() => { refreshModels(provider); }, [provider, refreshModels]);

  const currentProvider = providers.find((p) => p.id === provider);
  const isProviderUnconfigured = currentProvider && !currentProvider.configured;

  return (
    <div className={cn('grid gap-3 sm:grid-cols-2', className)}>
      <div>
        <label className="label-tiny">Provider</label>
        <select
          value={provider}
          onChange={(e) => {
            const next = e.target.value;
            onChange({ provider: next, model: '' });
          }}
          className="input-base mt-1.5"
          disabled={loadingProviders}
        >
          {allowAuto && <option value="auto">Auto (try free first)</option>}
          {providers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} {p.configured ? '✓' : (p.requiresKey ? '· no key' : '')}
            </option>
          ))}
        </select>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className="label-tiny">Model</label>
          {provider !== 'auto' && (
            <button
              type="button"
              onClick={() => refreshModels(provider)}
              className="text-[10px] text-muted hover:text-ink inline-flex items-center gap-1"
              title="Refresh models from provider"
            >
              <RefreshCw className={cn('h-2.5 w-2.5', loadingModels && 'animate-spin')} />
              Refresh
            </button>
          )}
        </div>
        <select
          value={model}
          onChange={(e) => onChange({ provider, model: e.target.value })}
          className="input-base mt-1.5"
          disabled={provider === 'auto' || loadingModels}
        >
          {provider === 'auto' ? (
            <option value="">— auto-pick —</option>
          ) : (
            <>
              <option value="">{loadingModels ? 'Loading…' : '— default —'}</option>
              {models.map((m) => (
                <option key={`${m.provider}-${m.id}`} value={m.id}>
                  {m.label}{m.contextLength ? ` (${(m.contextLength / 1000).toFixed(0)}k)` : ''}
                </option>
              ))}
            </>
          )}
        </select>
      </div>

      {isProviderUnconfigured && (
        <div className="sm:col-span-2 flex items-center gap-2 rounded bg-amber/10 border border-amber/30 px-3 py-2 text-xs text-amber">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>This provider has no key. </span>
          <Link href="/studio" className="inline-flex items-center gap-1 font-medium underline-offset-4 hover:underline">
            <KeyRound className="h-3 w-3" /> Add in AI Studio
          </Link>
        </div>
      )}
    </div>
  );
}
