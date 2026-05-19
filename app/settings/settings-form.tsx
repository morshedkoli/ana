'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Save, Download, Key } from 'lucide-react';

export function SettingsForm({ initial }: { initial: Record<string, unknown> }) {
  const [accountId, setAccountId] = useState((initial.cloudflare_account_id as string) || '');
  const [apiToken, setApiToken] = useState((initial.cloudflare_api_token as string) || '');
  const [tz, setTz] = useState((initial.posting_timezone as string) || 'Asia/Dhaka');
  const [times, setTimes] = useState(((initial.optimal_post_times as string[]) || ['19:00', '21:00']).join(', '));
  const [tags, setTags] = useState(((initial.default_hashtags as string[]) || []).join(', '));

  async function save() {
    const updates = [
      { key: 'cloudflare_account_id', value: accountId },
      { key: 'cloudflare_api_token', value: apiToken },
      { key: 'posting_timezone', value: tz },
      { key: 'optimal_post_times', value: times.split(',').map(s => s.trim()).filter(Boolean) },
      { key: 'default_hashtags', value: tags.split(',').map(s => s.trim()).filter(Boolean) },
    ];
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates }),
    });
    if (res.ok) toast.success('Saved');
    else toast.error('Save failed');
  }

  async function exportBackup() {
    const res = await fetch('/api/settings/backup');
    if (!res.ok) { toast.error('Backup failed'); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `studio-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Backup downloaded');
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <section className="card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Key className="h-4 w-4 text-accent" />
          <h2 className="font-display text-xl">Cloudflare Workers AI</h2>
        </div>
        <p className="text-sm text-muted">
          Get from{' '}
          <a href="https://dash.cloudflare.com" target="_blank" rel="noreferrer" className="text-accent underline-offset-4 hover:underline">
            Cloudflare Dashboard
          </a>
          {' '}→ Workers AI. Free tier: ~50–100 Flux images/day.
        </p>
        <div>
          <label className="label-tiny">Account ID</label>
          <input value={accountId} onChange={(e) => setAccountId(e.target.value)}
            className="input-base mt-1.5 font-mono" placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" />
        </div>
        <div>
          <label className="label-tiny">API Token</label>
          <input type="password" value={apiToken} onChange={(e) => setApiToken(e.target.value)}
            className="input-base mt-1.5 font-mono" placeholder="••••••••••••••••" />
        </div>
      </section>

      <section className="card p-6 space-y-4">
        <h2 className="font-display text-xl">Posting defaults</h2>
        <div>
          <label className="label-tiny">Timezone</label>
          <input value={tz} onChange={(e) => setTz(e.target.value)}
            className="input-base mt-1.5" placeholder="Asia/Dhaka" />
        </div>
        <div>
          <label className="label-tiny">Optimal post times (comma separated, 24h)</label>
          <input value={times} onChange={(e) => setTimes(e.target.value)}
            className="input-base mt-1.5" placeholder="19:00, 21:00" />
        </div>
        <div>
          <label className="label-tiny">Default hashtags</label>
          <input value={tags} onChange={(e) => setTags(e.target.value)}
            className="input-base mt-1.5" placeholder="#fyp, #bangladesh, #dhaka" />
        </div>
      </section>

      <div className="flex gap-2">
        <button onClick={save} className="btn-primary"><Save className="h-4 w-4" /> Save settings</button>
        <button onClick={exportBackup} className="btn-ghost"><Download className="h-4 w-4" /> Export backup</button>
      </div>
    </div>
  );
}
