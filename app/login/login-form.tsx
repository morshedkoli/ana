'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Mail, Lock, User as UserIcon, Eye, EyeOff, Sparkles, ShieldCheck, RefreshCw,
} from 'lucide-react';
import Link from 'next/link';

type Mode = 'login' | 'register';

export function LoginForm({
  bootstrap, nextPath, defaultMode,
}: {
  bootstrap: boolean;
  nextPath: string;
  defaultMode: Mode;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(defaultMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Force register mode whenever no user exists yet
  const lockedToRegister = bootstrap;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const url = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name: name || undefined }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Failed');
      toast.success(mode === 'login' ? 'Welcome back' : 'Account created');
      router.replace(nextPath || '/');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
      setSubmitting(false);
    }
  }

  return (
    <div className="card w-full max-w-md p-7 sm:p-8 space-y-6 animate-fade-in">
      <div className="space-y-1.5 text-center">
        <Link href="/" className="inline-flex items-baseline gap-2">
          <div className="h-2 w-2 rounded-full bg-accent shadow-[0_0_18px_hsl(var(--accent))]" />
          <h1 className="font-display text-2xl font-semibold tracking-tight">Studio</h1>
        </Link>
        {bootstrap ? (
          <>
            <h2 className="font-display text-xl">Set up your studio</h2>
            <p className="text-sm text-muted">
              No accounts yet. Create the admin user — you&apos;ll be logged in automatically.
            </p>
          </>
        ) : (
          <>
            <h2 className="font-display text-xl">
              {mode === 'login' ? 'Welcome back' : 'Create account'}
            </h2>
            <p className="text-sm text-muted">
              {mode === 'login'
                ? 'Sign in to access the dashboard.'
                : 'Set up your credentials to get in.'}
            </p>
          </>
        )}
      </div>

      <form onSubmit={submit} className="space-y-4">
        {mode === 'register' && (
          <div>
            <label className="label-tiny">Name (optional)</label>
            <div className="relative mt-1.5">
              <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="input-base pl-9"
                autoComplete="name"
              />
            </div>
          </div>
        )}

        <div>
          <label className="label-tiny">Email</label>
          <div className="relative mt-1.5">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="email" required autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="input-base pl-9"
              autoComplete="email"
            />
          </div>
        </div>

        <div>
          <label className="label-tiny">Password</label>
          <div className="relative mt-1.5">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type={showPassword ? 'text' : 'password'}
              required minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'register' ? 'Min 8 characters' : 'Your password'}
              className="input-base pl-9 pr-10"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : (
            bootstrap ? <Sparkles className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />
          )}
          {submitting
            ? (mode === 'login' ? 'Signing in…' : 'Creating account…')
            : (bootstrap ? 'Create admin account' : (mode === 'login' ? 'Sign in' : 'Create account'))}
        </button>

        {!lockedToRegister && (
          <p className="text-center text-xs text-muted">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              type="button"
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
              className="text-accent hover:underline underline-offset-4"
            >
              {mode === 'login' ? 'Register' : 'Sign in'}
            </button>
          </p>
        )}
      </form>
    </div>
  );
}
