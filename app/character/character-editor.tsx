'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Save, Upload, Star, Trash2 } from 'lucide-react';
import { BANGLA_VOICES } from '@/lib/tts/voices';
import type { Character, Image } from '@/lib/db/schema';
import { cn } from '@/lib/utils';

interface PersonaBible {
  age?: number; location?: string; occupation?: string;
  backstory?: string; personality?: string; speakingStyle?: string;
  signaturePhrases?: string[]; topics?: string[];
}
interface VisualTraits {
  face?: string; hair?: string; eyes?: string;
  skinTone?: string; body?: string; signatureTraits?: string[];
}
interface VoiceProfile {
  engine?: string; voiceId?: string; rate?: number; pitch?: number;
}

const TABS = ['Persona', 'Visual', 'Voice', 'Master image'] as const;
type Tab = typeof TABS[number];

export function CharacterEditor({
  character, recentImages,
}: { character: Character; recentImages: Image[] }) {
  const [tab, setTab] = useState<Tab>('Persona');
  const [name, setName] = useState(character.name);
  const [persona, setPersona] = useState<PersonaBible>(character.personaBible as PersonaBible || {});
  const [visual, setVisual] = useState<VisualTraits>(character.visualTraits as VisualTraits || {});
  const [voice, setVoice] = useState<VoiceProfile>(character.voiceProfile as VoiceProfile || {});
  const [masterImageId, setMasterImageId] = useState<string | null>(character.masterImageId ?? null);
  const [isPending, startTransition] = useTransition();

  async function save() {
    startTransition(async () => {
      const res = await fetch(`/api/character/${character.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          personaBible: persona,
          visualTraits: visual,
          voiceProfile: voice,
          masterImageId,
        }),
      });
      if (res.ok) toast.success('Saved');
      else toast.error('Save failed');
    });
  }

  async function testVoice() {
    const sample = 'হ্যালো, আমি ' + (name || 'একজন ছাত্রী') + '। তোমাদের সাথে দেখা হয়ে ভালো লাগল।';
    toast.info('Generating voice sample…');
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: sample, voice: voice.voiceId, rate: voice.rate, pitch: voice.pitch }),
    });
    if (!res.ok) { toast.error('Voice generation failed. Is edge-tts installed?'); return; }
    const data = await res.json();
    const audio = new Audio(data.publicPath);
    audio.play();
    toast.success('Playing sample');
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-border/60">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'relative px-4 py-2.5 text-sm font-medium transition-colors',
              tab === t ? 'text-ink' : 'text-muted hover:text-ink'
            )}
          >
            {t}
            {tab === t && <div className="absolute -bottom-px left-0 right-0 h-px bg-accent" />}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2 pb-2">
          <button onClick={save} disabled={isPending} className="btn-primary">
            <Save className="h-4 w-4" /> {isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {/* Name always editable on top */}
      <div className="card p-4">
        <label className="label-tiny">Character name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input-base mt-1.5 font-display text-2xl"
          placeholder="Give her a name"
        />
      </div>

      {tab === 'Persona' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Field label="Age">
            <input type="number" value={persona.age || ''}
              onChange={(e) => setPersona({ ...persona, age: parseInt(e.target.value) || undefined })}
              className="input-base" placeholder="22" />
          </Field>
          <Field label="Location">
            <input value={persona.location || ''}
              onChange={(e) => setPersona({ ...persona, location: e.target.value })}
              className="input-base" placeholder="Dhaka, Bangladesh" />
          </Field>
          <Field label="Occupation">
            <input value={persona.occupation || ''}
              onChange={(e) => setPersona({ ...persona, occupation: e.target.value })}
              className="input-base" placeholder="University student" />
          </Field>
          <Field label="Speaking style">
            <input value={persona.speakingStyle || ''}
              onChange={(e) => setPersona({ ...persona, speakingStyle: e.target.value })}
              className="input-base" placeholder="casual, friendly Bangla with English mix" />
          </Field>
          <Field label="Backstory" full>
            <textarea value={persona.backstory || ''}
              onChange={(e) => setPersona({ ...persona, backstory: e.target.value })}
              className="input-base min-h-24" rows={4}
              placeholder="Where she's from, what she does, what she cares about…" />
          </Field>
          <Field label="Personality" full>
            <textarea value={persona.personality || ''}
              onChange={(e) => setPersona({ ...persona, personality: e.target.value })}
              className="input-base min-h-24" rows={3}
              placeholder="Cheerful, witty, introverted, dramatic…" />
          </Field>
          <Field label="Signature phrases (comma separated)" full>
            <input value={(persona.signaturePhrases || []).join(', ')}
              onChange={(e) => setPersona({ ...persona, signaturePhrases: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
              className="input-base" placeholder="হাই গাইজ!, কেমন আছো তোমরা?" />
          </Field>
          <Field label="Topics (comma separated)" full>
            <input value={(persona.topics || []).join(', ')}
              onChange={(e) => setPersona({ ...persona, topics: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
              className="input-base" placeholder="university life, dhaka food, fashion, relationships" />
          </Field>
        </div>
      )}

      {tab === 'Visual' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <p className="lg:col-span-2 text-sm text-muted">
            These traits go into every image prompt so she stays recognizable. Be specific.
          </p>
          <Field label="Face">
            <input value={visual.face || ''}
              onChange={(e) => setVisual({ ...visual, face: e.target.value })}
              className="input-base" placeholder="oval face, soft cheekbones, full lips" />
          </Field>
          <Field label="Hair">
            <input value={visual.hair || ''}
              onChange={(e) => setVisual({ ...visual, hair: e.target.value })}
              className="input-base" placeholder="long black wavy hair, side-parted" />
          </Field>
          <Field label="Eyes">
            <input value={visual.eyes || ''}
              onChange={(e) => setVisual({ ...visual, eyes: e.target.value })}
              className="input-base" placeholder="warm brown eyes, almond-shaped" />
          </Field>
          <Field label="Skin tone">
            <input value={visual.skinTone || ''}
              onChange={(e) => setVisual({ ...visual, skinTone: e.target.value })}
              className="input-base" placeholder="warm beige Bengali complexion" />
          </Field>
          <Field label="Body">
            <input value={visual.body || ''}
              onChange={(e) => setVisual({ ...visual, body: e.target.value })}
              className="input-base" placeholder="slim, average height 5'4" />
          </Field>
          <Field label="Signature traits (comma separated)" full>
            <input value={(visual.signatureTraits || []).join(', ')}
              onChange={(e) => setVisual({ ...visual, signatureTraits: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
              className="input-base"
              placeholder="small mole on left cheek, silver hoop earrings, side dimple" />
          </Field>
          <div className="card lg:col-span-2 p-4">
            <p className="label-tiny mb-2">Preview prompt</p>
            <pre className="whitespace-pre-wrap rounded bg-bg p-3 text-xs text-muted font-mono">
{buildPreviewPrompt(name, visual)}
            </pre>
          </div>
        </div>
      )}

      {tab === 'Voice' && (
        <div className="space-y-4 max-w-2xl">
          <Field label="Engine">
            <select value={voice.engine || 'edge-tts'}
              onChange={(e) => setVoice({ ...voice, engine: e.target.value })}
              className="input-base">
              <option value="edge-tts">Edge TTS (free, unlimited)</option>
              <option value="elevenlabs">ElevenLabs (manual paste)</option>
            </select>
          </Field>
          <Field label="Voice">
            <select value={voice.voiceId || 'bn-BD-NabanitaNeural'}
              onChange={(e) => setVoice({ ...voice, voiceId: e.target.value })}
              className="input-base">
              {BANGLA_VOICES.map(v => (
                <option key={v.id} value={v.id}>{v.label}</option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label={`Rate (${voice.rate ?? 1.0}x)`}>
              <input type="range" min={0.5} max={1.5} step={0.05}
                value={voice.rate ?? 1.0}
                onChange={(e) => setVoice({ ...voice, rate: parseFloat(e.target.value) })}
                className="w-full" />
            </Field>
            <Field label={`Pitch (${voice.pitch ?? 0} Hz)`}>
              <input type="range" min={-20} max={20} step={1}
                value={voice.pitch ?? 0}
                onChange={(e) => setVoice({ ...voice, pitch: parseInt(e.target.value) })}
                className="w-full" />
            </Field>
          </div>
          <div className="flex gap-2">
            <button onClick={testVoice} className="btn-ghost">Test voice (Bangla sample)</button>
          </div>
        </div>
      )}

      {tab === 'Master image' && (
        <div className="space-y-4">
          <p className="text-sm text-muted">
            The master image is your reference for character consistency. Every new image
            should be compared to this one.
          </p>
          {recentImages.length === 0 ? (
            <div className="card p-8 text-center text-sm text-muted">
              No images yet. Go to <a href="/generate" className="text-accent underline-offset-4 hover:underline">Generate</a> first.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {recentImages.map((img) => {
                const isMaster = masterImageId === String(img.id);
                return (
                  <button
                    key={img.id}
                    onClick={() => setMasterImageId(img.id)}
                    className={cn(
                      'group relative aspect-[3/4] overflow-hidden rounded-md border-2 transition-all',
                      isMaster ? 'border-accent shadow-[0_0_24px_hsl(var(--accent)/0.3)]' : 'border-border hover:border-muted'
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.filePath.replace(/^.*\/storage\//, '/storage/')} alt="" className="h-full w-full object-cover" />
                    {isMaster && (
                      <div className="absolute right-2 top-2 rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-accent-fg">
                        <Star className="inline h-3 w-3" /> Master
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={cn('space-y-1.5', full && 'lg:col-span-2')}>
      <label className="label-tiny">{label}</label>
      {children}
    </div>
  );
}

function buildPreviewPrompt(name: string, v: VisualTraits) {
  const parts = [
    `Portrait of ${name || 'a young Bengali woman'}`,
    v.face, v.hair, v.eyes, v.skinTone, v.body,
    ...(v.signatureTraits || []),
    'photorealistic, natural lighting, shot on 50mm lens',
  ].filter(Boolean);
  return parts.join(', ');
}
