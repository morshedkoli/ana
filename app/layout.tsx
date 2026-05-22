import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from 'sonner';
import { Sidebar } from '@/components/shared/sidebar';
import { getCurrentUser } from '@/lib/auth/server';

export const metadata: Metadata = {
  title: 'Studio — AI Influencer Command Center',
  description: 'Plan, generate, and ship AI influencer content end-to-end.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

/**
 * Layout renders the sidebar shell only when there's a signed-in user.
 * Unauthenticated routes (login/register) get a bare full-bleed layout.
 *
 * The middleware redirects unauth users to /login, so this naturally results
 * in: /login → no sidebar, every other page → sidebar with the user's profile.
 */
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <html lang="en" className="dark">
        <body className="grain min-h-screen">
          {children}
          <Toaster theme="dark" position="bottom-right" richColors />
        </body>
      </html>
    );
  }

  return (
    <html lang="en" className="dark">
      <body className="grain">
        <div className="flex min-h-screen flex-col lg:flex-row">
          <Sidebar
            currentUser={{ email: user.email, name: user.name, role: user.role }}
          />
          <main className="flex-1 overflow-x-hidden">
            <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-12">
              {children}
            </div>
          </main>
        </div>
        <Toaster theme="dark" position="bottom-right" richColors />
      </body>
    </html>
  );
}
