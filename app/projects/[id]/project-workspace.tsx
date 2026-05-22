'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Save, Check, Hash, Copy, ExternalLink, Sparkles, RefreshCw } from 'lucide-react';
import type { VideoProject, ProductionTask } from '@/lib/db/schema';
import { cn, formatDuration } from '@/lib/utils';
import { ProviderModelPicker } from '@/components/shared/provider-model-picker';

const TABS = ['Script', 'Production', 'Post'] as const;
type Tab = typeof TABS[number];

export function ProjectWorkspace({
  project: initialProject, tasks: initialTasks,
}: { project: VideoProject; tasks: ProductionTask[] }) {
  const [tab, setTab] = useState<Tab>('Script');
  const [project, setProject] = useState(initialProject);
  const [tasks, setTasks] = useState(initialTasks);
  const [saving, setSaving] = useState(false);

  async function save(patch: Partial<VideoProject>) {
    setSaving(true);
    setProject((p) => ({ ...p, ...patch }));
    await fetch(`/api/projects/${project.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    setSaving(false);
    toast.success('Saved');
  }

  async function toggleTask(t: ProductionTask) {
    const newDone = !t.isDone;
    setTasks((p) => p.map((x) => x.id === t.id ? { ...x, isDone: newDone } : x));
    await fetch(`/api/tasks/${t.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isDone: newDone }),
    });
  }

  const doneCount = tasks.filter((t) => t.isDone).length;

  // AI text generation state (shared across Script + Post tabs)
  const [aiProvider, setAiProvider] = useState('pollinations');
  const [aiModel, setAiModel] = useState('');
  const [aiBusy, setAiBusy] = useState<string | null>(null);

  async function aiGenerate(target: 'script' | 'caption' | 'hashtags') {
    setAiBusy(target);
    try {
      let systemPrompt = '';
      let userPrompt = '';
      if (target === 'script') {
        systemPrompt = 'You are a Bangladeshi short-form video script writer. Write in Bangla (Bengali script) with occasional English mixing as Gen Z creators do. Keep it 60–90 seconds, casual, with strong hook in the first 2 seconds.';
        userPrompt = `Write a TikTok/Reels script in Bangla for: ${project.title}\nContent type: ${project.contentType}\n${project.hook ? `Hook idea: ${project.hook}` : ''}\nReturn just the script body.`;
      } else if (target === 'caption') {
        systemPrompt = 'You write engaging short captions for Bangladeshi TikTok content. Use Bangla naturally. Keep under 150 chars.';
        userPrompt = `Write a caption for this video:\nTitle: ${project.title}\nScript:\n${project.scriptBangla?.slice(0, 800) || '(no script)'}\nReturn only the caption.`;
      } else {
        systemPrompt = 'You generate trending hashtags for Bangladeshi TikTok content.';
        userPrompt = `Generate 8-12 hashtags for this video. Mix Bangla audience hashtags (#bangladesh #dhaka #bangla) with niche tags. Return as comma-separated list, no explanations.\nTitle: ${project.title}\nType: ${project.contentType}`;
      }

      const r = await fetch('/api/ai/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: aiProvider,
          model: aiModel || undefined,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);

      if (target === 'script') {
        await save({ scriptBangla: data.text });
      } else if (target === 'caption') {
        await save({ caption: data.text.trim() });
      } else {
        const tags = data.text
          .split(/[,\n]/)
          .map((s: string) => s.trim().replace(/^#/, ''))
          .filter(Boolean);
        await save({ hashtags: tags });
      }
      toast.success(`AI generated ${target}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'AI generation failed');
    } finally {
      setAiBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center border-b border-border/60">
        <div className="flex flex-1 min-w-0 overflow-x-auto -mb-px">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={cn('relative whitespace-nowrap px-3 sm:px-4 py-2.5 text-sm font-medium', tab === t ? 'text-ink' : 'text-muted hover:text-ink')}>
              {t}
              {t === 'Production' && (
                <span className="ml-2 text-[10px] text-muted">{doneCount}/{tasks.length}</span>
              )}
              {tab === t && <div className="absolute bottom-0 left-0 right-0 h-px bg-accent" />}
            </button>
          ))}
        </div>
        <div className="ml-auto pb-2 pl-2 text-xs text-muted">{saving && 'Saving…'}</div>
      </div>

      {tab === 'Script' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div>
              <label className="label-tiny">Hook (first 2 seconds)</label>
              <textarea
                defaultValue={project.hook || ''}
                onBlur={(e) => save({ hook: e.target.value })}
                placeholder="তোমরা জানো না, আজ কী হয়েছে…"
                lang="bn"
                className="input-base bangla mt-1.5"
                rows={2}
              />
            </div>
            <div>
              <label className="label-tiny">Script (Bangla)</label>
              <textarea
                key={project.scriptBangla || 'empty'}
                defaultValue={project.scriptBangla || ''}
                onBlur={(e) => save({ scriptBangla: e.target.value })}
                placeholder="বাংলায় তোমার স্ক্রিপ্ট এখানে লিখো…"
                lang="bn"
                className="input-base bangla mt-1.5 min-h-64"
                rows={12}
              />
              <p className="mt-1.5 text-xs text-muted">
                ~{formatDuration((project.scriptBangla?.length || 0) / 14)} read time
              </p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="card p-4 space-y-3">
              <p className="label-tiny flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-accent" /> AI assist
              </p>
              <ProviderModelPicker
                kind="text"
                provider={aiProvider}
                model={aiModel}
                onChange={({ provider, model }) => { setAiProvider(provider); setAiModel(model); }}
              />
              <button
                onClick={() => aiGenerate('script')}
                disabled={aiBusy !== null}
                className="btn-primary w-full"
              >
                {aiBusy === 'script' ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Generate Bangla script
              </button>
            </div>
            <div>
              <label className="label-tiny">English notes (for your reference)</label>
              <textarea
                defaultValue={project.scriptEnglish || ''}
                onBlur={(e) => save({ scriptEnglish: e.target.value })}
                className="input-base mt-1.5 min-h-32"
                rows={6}
                placeholder="Translation, beats, what to emphasize…"
              />
            </div>
            <div className="card p-4">
              <p className="label-tiny mb-2">Quick actions</p>
              <div className="flex flex-wrap gap-2">
                <a href={`/voice?script=${encodeURIComponent(project.scriptBangla || '')}`} className="btn-ghost">
                  Generate voice →
                </a>
                <a href="/generate" className="btn-ghost">Generate image →</a>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'Production' && (
        <div className="max-w-2xl space-y-2">
          {tasks.map((t) => (
            <button key={t.id} onClick={() => toggleTask(t)}
              className={cn('card flex w-full items-center gap-3 p-3 text-left transition-all',
                t.isDone && 'opacity-60')}>
              <div className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded border transition-colors',
                t.isDone ? 'bg-accent border-accent text-accent-fg' : 'border-border'
              )}>
                {t.isDone && <Check className="h-3.5 w-3.5" />}
              </div>
              <span className={cn('text-sm', t.isDone && 'line-through')}>{t.taskName}</span>
            </button>
          ))}
        </div>
      )}

      {tab === 'Post' && (
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <label className="label-tiny">Caption</label>
                <button
                  onClick={() => aiGenerate('caption')}
                  disabled={aiBusy !== null}
                  className="text-xs text-accent hover:brightness-110 inline-flex items-center gap-1"
                >
                  {aiBusy === 'caption' ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  AI write
                </button>
              </div>
              <textarea
                key={project.caption || 'empty-caption'}
                defaultValue={project.caption || ''}
                onBlur={(e) => save({ caption: e.target.value })}
                className="input-base mt-1.5"
                rows={4}
                placeholder="Your TikTok caption here"
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="label-tiny">Hashtags (comma separated)</label>
                <button
                  onClick={() => aiGenerate('hashtags')}
                  disabled={aiBusy !== null}
                  className="text-xs text-accent hover:brightness-110 inline-flex items-center gap-1"
                >
                  {aiBusy === 'hashtags' ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  AI suggest
                </button>
              </div>
              <input
                key={(project.hashtags || []).join(',')}
                defaultValue={(project.hashtags || []).join(', ')}
                onBlur={(e) => save({ hashtags: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                className="input-base mt-1.5"
                placeholder="#fyp, #bangladesh, #dhaka, #viral"
              />
              <div className="mt-2 flex flex-wrap gap-1">
                {(project.hashtags || []).map((h) => (
                  <span key={h} className="pill"><Hash className="h-3 w-3" />{h.replace(/^#/, '')}</span>
                ))}
              </div>
            </div>
            <div>
              <label className="label-tiny">Posted URL (after publishing)</label>
              <input
                defaultValue={project.postedUrl || ''}
                onBlur={(e) => save({ postedUrl: e.target.value, postedAt: e.target.value ? new Date().toISOString() : undefined, status: e.target.value ? 'posted' : project.status })}
                className="input-base mt-1.5"
                placeholder="https://www.tiktok.com/@you/video/…"
              />
            </div>
          </div>
          <div className="space-y-3">
            <div className="card p-4 space-y-3">
              <p className="label-tiny flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-accent" /> AI model
              </p>
              <ProviderModelPicker
                kind="text"
                provider={aiProvider}
                model={aiModel}
                onChange={({ provider, model }) => { setAiProvider(provider); setAiModel(model); }}
              />
            </div>
            <div className="card p-4">
              <p className="label-tiny mb-2 text-amber">⚠ Required before posting</p>
              <ul className="space-y-1.5 text-sm text-muted">
                <li>✓ Toggle TikTok&apos;s &ldquo;AI-generated&rdquo; label when posting</li>
                <li>✓ Mention &ldquo;AI Creator&rdquo; in your bio</li>
                <li>✓ Trim watermarks (zoom 105%)</li>
                <li>✓ Add Bangla captions in CapCut</li>
                <li>✓ Vertical 9:16, 1080×1920</li>
              </ul>
            </div>
            <a
              href="https://www.tiktok.com/upload"
              target="_blank" rel="noreferrer"
              className="btn-primary w-full"
            >
              <ExternalLink className="h-4 w-4" /> Open TikTok Upload
            </a>
            <button
              onClick={() => {
                const text = `${project.caption || ''}\n\n${(project.hashtags || []).join(' ')}`;
                navigator.clipboard.writeText(text);
                toast.success('Copied caption + hashtags');
              }}
              className="btn-ghost w-full"
            >
              <Copy className="h-4 w-4" /> Copy caption + hashtags
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
