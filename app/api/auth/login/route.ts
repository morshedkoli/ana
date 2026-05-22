import { NextRequest, NextResponse } from 'next/server';
import { connectDB, users } from '@/lib/db/client';
import { verifyPassword } from '@/lib/auth/password';
import { signSession, COOKIE_NAME, SESSION_TTL_SEC } from '@/lib/auth/session';

export const runtime = 'nodejs';

/**
 * POST /api/auth/login
 * Body: { email, password }
 *
 * Constant-time password verify, sets the session cookie on success.
 * Returns the same generic error for both "no user" and "wrong password" so
 * we don't leak which emails are registered.
 */
export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (typeof email !== 'string' || typeof password !== 'string') {
      return NextResponse.json({ error: 'email and password required' }, { status: 400 });
    }

    await connectDB();
    const doc = await users.findOne({ email: email.toLowerCase().trim() });
    // Always do the hash comparison so timing is similar for missing-user case.
    const fakeHash = 'scrypt:16384:8:1:0000:0000';
    const ok = await verifyPassword(password, doc?.passwordHash || fakeHash);
    if (!doc || !ok || doc.isActive === false) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    doc.lastLoginAt = new Date();
    await doc.save();

    const token = await signSession({
      sub: doc.id,
      eml: doc.email,
      role: (doc.role as 'admin' | 'user') || 'user',
      ep: doc.sessionEpoch ?? 0,
    });

    const res = NextResponse.json({
      ok: true,
      user: { id: doc.id, email: doc.email, name: doc.name || null, role: doc.role || 'user' },
    });
    res.cookies.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: SESSION_TTL_SEC,
    });
    return res;
  } catch (err) {
    console.error('login error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Login failed' },
      { status: 500 }
    );
  }
}
