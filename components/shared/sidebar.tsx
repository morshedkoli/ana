'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  LayoutDashboard, User, ImageIcon, Mic, TrendingUp,
  Scissors, Calendar, ListChecks, Settings, Sparkles, Menu, X, Cpu,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/character', label: 'Character', icon: User },
  { href: '/library', label: 'Image Library', icon: ImageIcon },
  { href: '/generate', label: 'Generate', icon: Sparkles },
  { href: '/studio', label: 'AI Studio', icon: Cpu },
  { href: '/voice', label: 'Voice Lab', icon: Mic },
  { href: '/trends', label: 'Trends', icon: TrendingUp },
  { href: '/extract', label: 'Frame Extract', icon: Scissors },
  { href: '/calendar', label: 'Calendar', icon: Calendar },
  { href: '/queue', label: 'Post Queue', icon: ListChecks },
];

interface SidebarUser {
  email: string;
  name?: string | null;
  role: string;
}

export function Sidebar({ currentUser }: { currentUser?: SidebarUser | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // Close drawer when route changes
  useEffect(() => { setOpen(false); }, [pathname]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [open]);

  async function signOut() {
    setSigningOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      toast.success('Signed out');
      router.replace('/login');
      router.refresh();
    } catch {
      toast.error('Sign out failed');
      setSigningOut(false);
    }
  }

  const initial = (currentUser?.name || currentUser?.email || '?').slice(0, 1).toUpperCase();
  const displayLabel = currentUser?.name || currentUser?.email || '';

  return (
    <>
      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border/60 bg-bg/85 backdrop-blur-md px-4 py-3 lg:hidden">
        <Link href="/" className="flex items-baseline gap-2">
          <div className="h-2 w-2 rounded-full bg-accent shadow-[0_0_18px_hsl(var(--accent))]" />
          <h1 className="font-display text-lg font-semibold tracking-tight">Studio</h1>
        </Link>
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="btn-icon"
        >
          <Menu className="h-4 w-4" />
        </button>
      </header>

      {/* Drawer overlay */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-fade-in lg:hidden"
        />
      )}

      {/* Sidebar — fixed drawer on mobile, sticky column on desktop */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-[260px] shrink-0 border-r border-border/60 bg-surface backdrop-blur-md transition-transform duration-200',
          'lg:sticky lg:top-0 lg:z-30 lg:h-screen lg:w-[244px] lg:translate-x-0 lg:bg-surface/40',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between px-6 py-6">
            <div>
              <Link href="/" className="flex items-baseline gap-2">
                <div className="h-2 w-2 rounded-full bg-accent shadow-[0_0_18px_hsl(var(--accent))]" />
                <h1 className="font-display text-xl font-semibold tracking-tight">Studio</h1>
              </Link>
              <p className="label-tiny mt-1">Influencer command</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="btn-icon lg:hidden"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 pb-2">
            <ul className="space-y-1">
              {NAV.map(({ href, label, icon: Icon }) => {
                const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      className={cn(
                        'group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-all',
                        active
                          ? 'bg-elevated text-ink shadow-sm'
                          : 'text-muted hover:text-ink hover:bg-elevated/60'
                      )}
                    >
                      <Icon className={cn('h-[16px] w-[16px] transition-colors', active && 'text-accent')} />
                      <span className="font-medium">{label}</span>
                      {active && <div className="ml-auto h-1 w-1 rounded-full bg-accent" />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="border-t border-border/60 px-3 py-3 space-y-2">
            <Link
              href="/settings"
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                pathname.startsWith('/settings') ? 'bg-elevated text-ink' : 'text-muted hover:text-ink'
              )}
            >
              <Settings className="h-[16px] w-[16px]" />
              <span className="font-medium">Settings</span>
            </Link>

            {currentUser && (
              <div className="flex items-center gap-2 rounded-md bg-elevated/60 px-2 py-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/20 text-xs font-medium text-accent">
                  {initial}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium" title={displayLabel}>
                    {displayLabel}
                  </p>
                  <p className="truncate text-[10px] text-muted">
                    {currentUser.role === 'admin' ? '★ admin' : 'user'}
                  </p>
                </div>
                <button
                  onClick={signOut}
                  disabled={signingOut}
                  className="btn-icon h-7 w-7 shrink-0"
                  title="Sign out"
                  aria-label="Sign out"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
