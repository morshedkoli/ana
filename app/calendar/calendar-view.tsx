'use client';

import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalIcon } from 'lucide-react';
import type { VideoProject } from '@/lib/db/schema';
import { cn } from '@/lib/utils';

const STATUS_COLORS: Record<string, string> = {
  idea: 'bg-muted/30 border-muted/40 text-muted',
  scripted: 'bg-amber/20 border-amber/40 text-amber',
  assets: 'bg-amber/20 border-amber/40 text-amber',
  produced: 'bg-accent/20 border-accent/40 text-accent',
  edited: 'bg-accent/20 border-accent/40 text-accent',
  ready: 'bg-success/20 border-success/40 text-success',
  posted: 'bg-elevated border-border text-muted opacity-60',
};

const CONTENT_TYPES = ['talking', 'dance', 'trend', 'storytime', 'tutorial', 'reaction', 'bts'] as const;
const STATUSES = ['idea', 'scripted', 'assets', 'produced', 'edited', 'ready', 'posted'] as const;

export function CalendarView({ projects: initial }: { projects: VideoProject[] }) {
  const [projects, setProjects] = useState(initial);
  const [cursor, setCursor] = useState(new Date());
  const [creating, setCreating] = useState<string | null>(null); // ISO date for new project
  const [editing, setEditing] = useState<VideoProject | null>(null);

  const calendarDays = useMemo(() => buildMonth(cursor), [cursor]);

  function projectsForDate(iso: string) {
    return projects.filter((p) => p.scheduledDate === iso);
  }

  async function createProject(date: string, title: string, contentType: string) {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scheduledDate: date, title, contentType, status: 'idea' }),
    });
    if (res.ok) {
      const p = await res.json();
      setProjects((prev) => [p, ...prev]);
      setCreating(null);
      toast.success('Created');
    } else toast.error('Failed to create');
  }

  async function updateStatus(id: number, status: string) {
    setProjects((prev) => prev.map((p) => p.id === id ? { ...p, status } : p));
    await fetch(`/api/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="card flex items-center justify-between p-3">
        <div className="flex items-center gap-2">
          <button onClick={() => setCursor(addMonths(cursor, -1))} className="btn-icon">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h2 className="font-display text-xl px-2">
            {cursor.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
          </h2>
          <button onClick={() => setCursor(addMonths(cursor, 1))} className="btn-icon">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <button onClick={() => setCursor(new Date())} className="btn-ghost text-xs">Today</button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 px-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="label-tiny text-center">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((d, i) => {
          const iso = d.date.toISOString().slice(0, 10);
          const dayProjects = projectsForDate(iso);
          const isToday = iso === new Date().toISOString().slice(0, 10);
          return (
            <div key={i} className={cn(
              'card min-h-[120px] p-2 transition-colors',
              !d.inMonth && 'opacity-40',
              isToday && 'border-accent/50 shadow-[0_0_18px_hsl(var(--accent)/0.15)]'
            )}>
              <div className="mb-1 flex items-center justify-between">
                <span className={cn('text-xs', isToday && 'font-bold text-accent')}>
                  {d.date.getDate()}
                </span>
                <button onClick={() => setCreating(iso)} className="btn-icon h-5 w-5">
                  <Plus className="h-3 w-3" />
                </button>
              </div>
              <div className="space-y-1">
                {dayProjects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setEditing(p)}
                    className={cn(
                      'block w-full rounded border px-1.5 py-1 text-left text-[10px] leading-tight',
                      STATUS_COLORS[p.status || 'idea']
                    )}
                  >
                    <div className="truncate font-medium">{p.title}</div>
                    <div className="opacity-70">{p.contentType}</div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create modal */}
      {creating && (
        <CreateModal
          date={creating}
          onClose={() => setCreating(null)}
          onCreate={(title, type) => createProject(creating, title, type)}
        />
      )}

      {/* Edit modal */}
      {editing && (
        <EditModal
          project={editing}
          onClose={() => setEditing(null)}
          onStatusChange={(s) => updateStatus(editing.id, s)}
        />
      )}
    </div>
  );
}

function CreateModal({ date, onClose, onCreate }: {
  date: string; onClose: () => void; onCreate: (title: string, type: string) => void;
}) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<typeof CONTENT_TYPES[number]>('talking');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-md card p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div>
          <p className="label-tiny">New video — {date}</p>
          <h3 className="font-display text-2xl mt-1">Plan a video</h3>
        </div>
        <div>
          <label className="label-tiny">Working title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)}
            className="input-base mt-1.5" autoFocus
            placeholder="Dhaka coffee tour day 1" />
        </div>
        <div>
          <label className="label-tiny">Content type</label>
          <select value={type} onChange={(e) => setType(e.target.value as typeof CONTENT_TYPES[number])} className="input-base mt-1.5">
            {CONTENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button
            disabled={!title.trim()}
            onClick={() => onCreate(title, type)}
            className="btn-primary"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

function EditModal({ project, onClose, onStatusChange }: {
  project: VideoProject; onClose: () => void; onStatusChange: (s: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-lg card p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div>
          <p className="label-tiny">{project.scheduledDate} · {project.contentType}</p>
          <h3 className="font-display text-2xl mt-1">{project.title}</h3>
        </div>
        <div>
          <label className="label-tiny">Status</label>
          <select value={project.status || 'idea'} onChange={(e) => onStatusChange(e.target.value)} className="input-base mt-1.5">
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <a href={`/projects/${project.id}`} className="btn-primary">Open project →</a>
          <button onClick={onClose} className="btn-ghost">Close</button>
        </div>
      </div>
    </div>
  );
}

function buildMonth(cursor: Date): { date: Date; inMonth: boolean }[] {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const start = new Date(first);
  start.setDate(start.getDate() - first.getDay());
  const days: { date: Date; inMonth: boolean }[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push({ date: d, inMonth: d.getMonth() === month });
  }
  return days;
}

function addMonths(d: Date, n: number): Date {
  const r = new Date(d);
  r.setMonth(r.getMonth() + n);
  return r;
}
