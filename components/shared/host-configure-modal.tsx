'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  X, KeyRound, Save, Eye, EyeOff, Trash2, RefreshCw, Check,
  ExternalLink, Star, Cloud,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface HostInfo {
  id: string;
  name: string;
  description: string;
  homepageUrl: string;
  keysHelp?: string;
  requiresKey: boolean;
  requiresAccount?: boolean;
  capabilities: { upload: boolean; delete: boolean; listRemote: boolean };
  freeTier?: string;
  configured: boolean;
  hasKey: boolean;
  hasAccount: boolean;
  account: string;
}

/**
 * Modal listing every image-hosting provider so the user can:
 *  - mark one as the default uploader
 *  - paste / clear / test API keys
 * Used by the Library page (Configure button) and the dashboard tile.
 */
export function HostConfigureModal({
  open, onClose, onChanged,
}: {
  open: boolean;
  onClose: () => void;
  onChanged?: () => void;
}) {
  const [hosts, setHosts] = useState<HostInfo[]>([]);
  const [defaultHost, setDefaultHost] = useState<string>('local');
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch('/api/image-hosts');
      const data = await r.json();
      setHosts(data.hosts || []);
      setDefaultHost(data.defaultHost || 'local');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) load();
  }, [open]);

  // Lock body scroll while modal is open
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  async function setDefault(id: string) {
    const r = await fetch('/api/image-hosts/default', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (r.ok) {
      setDefaultHost(id);
      toast.success(`Default host: ${hosts.find((h) => h.id === id)?.name}`);
      onChanged?.();
    } else {
      toast.error('Failed to set default');
    }
  }

  if (!open) return null;

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
            <h2 className="font-display text-xl">Image hosts</h2>
            <p className="text-xs text-muted">
              Connect free image hosting providers. Default upload target gets a
              <Star className="inline h-3 w-3 mx-1 text-accent fill-current" />.
            </p>
          </div>
          <button onClick={onClose} className="btn-icon">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 p-5 max-h-[80vh] overflow-y-auto">
          {loading && hosts.length === 0 && (
            <div className="text-center text-sm text-muted py-8">
              <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin" />
              Loading providers…
            </div>
          )}
          {hosts.map((h) => (
            <HostRow
              key={h.id} host={h}
              isDefault={defaultHost === h.id}
              onMakeDefault={() => setDefault(h.id)}
              onChanged={() => { load(); onChanged?.(); }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function HostRow({
  host, isDefault, onMakeDefault, onChanged,
}: {
  host: HostInfo;
  isDefault: boolean;
  onMakeDefault: () => void;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [apiAccount, setApiAccount] = useState(host.account || '');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const r = await fetch(`/api/image-hosts/${host.id}/keys`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, apiAccount }),
      });
      if (!r.ok) throw new Error((await r.json()).error || 'Failed');
      toast.success(`${host.name} saved`);
      setEditing(false);
      setApiKey('');
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function clear() {
    if (!confirm(`Remove ${host.name} credentials?`)) return;
    const r = await fetch(`/api/image-hosts/${host.id}/keys`, { method: 'DELETE' });
    if (r.ok) {
      toast.success('Cleared');
      setApiAccount('');
      onChanged();
    } else toast.error('Failed');
  }

  async function test() {
    setTesting(true);
    try {
      const r = await fetch(`/api/image-hosts/${host.id}/test`, { method: 'POST' });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Test failed');
      toast.success(`${host.name} works! ${data.url ? 'URL: ' + data.url.slice(0, 50) + '…' : ''}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Test failed');
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className={cn('card p-4 space-y-3', isDefault && 'border-accent/50')}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display text-lg">{host.name}</h3>
            {isDefault && (
              <span className="pill pill-accent">
                <Star className="h-3 w-3 fill-current" /> default
              </span>
            )}
            {host.configured ? (
              <span className="pill pill-success"><Check className="h-3 w-3" /> ready</span>
            ) : host.requiresKey ? (
              <span className="pill pill-amber">needs key</span>
            ) : (
              <span className="pill pill-success"><Check className="h-3 w-3" /> free</span>
            )}
            {host.capabilities.listRemote && <span className="pill"><Cloud className="h-3 w-3" /> browse</span>}
          </div>
          <p className="mt-1 text-xs text-muted">{host.description}</p>
          {host.freeTier && (
            <p className="mt-1 text-[11px] text-muted">
              <span className="text-accent">Free tier:</span> {host.freeTier}
            </p>
          )}
        </div>
        {host.homepageUrl && host.homepageUrl !== '#' && (
          <a
            href={host.homepageUrl}
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
          {host.requiresKey && (
            <button onClick={() => setEditing(true)} className="btn-ghost flex-1 sm:flex-none">
              <KeyRound className="h-3.5 w-3.5" />
              {host.hasKey ? 'Replace key' : 'Add key'}
            </button>
          )}
          {host.configured && (
            <button onClick={test} disabled={testing} className="btn-ghost">
              {testing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : 'Test'}
            </button>
          )}
          {!isDefault && host.configured && (
            <button onClick={onMakeDefault} className="btn-ghost">
              <Star className="h-3.5 w-3.5" /> Make default
            </button>
          )}
          {host.requiresKey && host.hasKey && (
            <button onClick={clear} className="btn-icon hover:text-danger" title="Remove credentials">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {editing && (
        <div className="space-y-3 rounded-md bg-elevated p-3 border border-border">
          {host.keysHelp && (
            <p className="text-xs text-muted">{host.keysHelp}</p>
          )}
          {host.requiresAccount && (
            <div>
              <label className="label-tiny">
                {host.id === 'cloudinary' ? 'Cloud name' : 'Account / project ID'}
              </label>
              <input
                value={apiAccount}
                onChange={(e) => setApiAccount(e.target.value)}
                placeholder={host.id === 'cloudinary' ? 'your-cloud-name' : 'account id'}
                className="input-base mt-1.5 font-mono"
              />
            </div>
          )}
          <div>
            <label className="label-tiny">
              {host.id === 'cloudinary' ? 'API key:secret' : 'API key'}
            </label>
            <div className="relative mt-1.5">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={
                  host.id === 'cloudinary'
                    ? '123456789012345:abcdef…'
                    : host.hasKey ? '••••••••  (replace existing)' : 'paste key here'
                }
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
