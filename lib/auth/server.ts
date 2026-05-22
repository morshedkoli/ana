/**
 * Server-only auth helpers.
 *  - getCurrentUser()        → resolves the active user from the cookie
 *  - requireUser()           → same, but throws/redirects if missing
 *  - hasAnyUser()            → first-run detection for the bootstrap flow
 *
 * Verifies the cookie's HMAC, then re-validates the user's `sessionEpoch`
 * against the DB so we can hard-revoke stolen sessions or stale-after-rename
 * tokens. Cached per-request via React's `cache()`.
 */
import 'server-only';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { connectDB, users } from '@/lib/db/client';
import type { User } from '@/lib/db/schema';
import { COOKIE_NAME, verifySession } from './session';
import type { SessionPayload } from './session';

async function readSession(): Promise<SessionPayload | null> {
  const c = await cookies();
  const token = c.get(COOKIE_NAME)?.value;
  return verifySession(token);
}

export const getCurrentUser = cache(async (): Promise<User | null> => {
  const session = await readSession();
  if (!session) return null;
  await connectDB();
  const doc = await users.findById(session.sub);
  if (!doc) return null;
  if (doc.isActive === false) return null;
  if ((doc.sessionEpoch ?? 0) !== session.ep) return null;
  return doc.toJSON() as unknown as User;
});

export async function requireUser(): Promise<User> {
  const u = await getCurrentUser();
  if (!u) throw new Error('Unauthorized');
  return u;
}

export async function hasAnyUser(): Promise<boolean> {
  await connectDB();
  return (await users.countDocuments()) > 0;
}
