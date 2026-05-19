'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, User, ImageIcon, Mic, TrendingUp,
  Scissors, Calendar, ListChecks, Settings, Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/character', label: 'Character', icon: User },
  { href: '/library', label: 'Image Library', icon: ImageIcon },
  { href: '/generate', label: 'Generate', icon: Sparkles },
  { href: '/voice', label: 'Voice Lab', icon: Mic },
  { href: '/trends', label: 'Trends', icon: TrendingUp },
  { href: '/extract', label: 'Frame Extract', icon: Scissors },
  { href: '/calendar', label: 'Calendar', icon: Calendar },
  { href: '/queue', label: 'Post Queue', icon: ListChecks },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 h-screen w-[244px] shrink-0 border-r border-border/60 bg-surface/40 backdrop-blur-md">
      <div className="flex h-full flex-col">
        <div className="px-6 py-6">
          <Link href="/" className="flex items-baseline gap-2">
            <div className="h-2 w-2 rounded-full bg-accent shadow-[0_0_18px_hsl(var(--accent))]" />
            <h1 className="font-display text-xl font-semibold tracking-tight">Studio</h1>
          </Link>
          <p className="label-tiny mt-1">Influencer command</p>
        </div>

        <nav className="flex-1 px-3 pb-2">
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

        <div className="border-t border-border/60 px-3 py-3">
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
        </div>
      </div>
    </aside>
  );
}
