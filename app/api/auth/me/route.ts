import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/server';
import { connectDB, users } from '@/lib/db/client';

export const runtime = 'nodejs';

/**
 * GET /api/auth/me
 * Returns the current user (or { user: null }), plus a `bootstrap` flag the
 * login page uses to switch into "create the first account" mode.
 */
export async function GET() {
  const me = await getCurrentUser();
  await connectDB();
  const totalUsers = await users.countDocuments();
  return NextResponse.json({
    user: me || null,
    bootstrap: totalUsers === 0,
  });
}
