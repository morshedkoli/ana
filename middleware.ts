/**
 * Auth gate.
 *
 * Runs on every non-static request. Verifies the session cookie's HMAC and
 * redirects unauthenticated users to /login. Routes whitelisted below
 * (login, register, auth APIs, /storage assets) bypass the check.
 *
 * Note: middleware runs in the Edge runtime, so we use Web Crypto via
 * `verifySession` (no node:crypto / mongoose imports).
 */
import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE_NAME, verifySession } from '@/lib/auth/session';

const PUBLIC_PATHS = [
  '/login',
  '/register',
];

const PUBLIC_API_PREFIXES = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/me',
  '/api/auth/logout',
];

const PUBLIC_PREFIXES = [
  '/_next',
  '/favicon',
  '/storage',     // images/audio/videos are served via /api/storage
  '/api/storage', // direct asset reads
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Static + public asset paths bypass auth entirely
  for (const p of PUBLIC_PREFIXES) {
    if (pathname.startsWith(p)) return NextResponse.next();
  }

  // Public auth routes
  if (PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next();
  }
  for (const p of PUBLIC_API_PREFIXES) {
    if (pathname.startsWith(p)) return NextResponse.next();
  }

  // Verify session cookie
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = await verifySession(token);

  if (!session) {
    // For API routes, return 401 JSON instead of redirecting so client
    // fetches surface a clean error rather than HTML.
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    if (pathname !== '/' && pathname !== '/login') {
      url.searchParams.set('next', pathname + (req.nextUrl.search || ''));
    }
    return NextResponse.redirect(url);
  }

  // Pass user info down to downstream handlers via header for cheap reads
  const res = NextResponse.next();
  res.headers.set('x-user-id', session.sub);
  res.headers.set('x-user-role', session.role);
  return res;
}

export const config = {
  // Match everything except Next internal asset chunks. Keep this loose; the
  // PUBLIC_PREFIXES list above handles the actual exemption logic so it stays
  // visible/editable in one place.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
