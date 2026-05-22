import { NextRequest, NextResponse } from 'next/server';
import { connectDB, users } from '@/lib/db/client';
import { hashPassword } from '@/lib/auth/password';
import { signSession, COOKIE_NAME, SESSION_TTL_SEC } from '@/lib/auth/session';
import { getCurrentUser } from '@/lib/auth/server';

export const runtime = 'nodejs';

/**
 * POST /api/auth/register
 *
 * Two flows:
 *  1. Bootstrap (first user) — runs when the users collection is empty.
 *     The created user becomes admin, no auth required, and they get logged
 *     in immediately so the admin panel works right after registration.
 *  2. Admin invite — only existing admins can create additional users.
 *     The new user does NOT get logged in; they receive a separate
 *     credentials confirmation message.
 */
export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json();
    if (typeof email !== 'string' || typeof password !== 'string') {
      return NextResponse.json({ error: 'email and password required' }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    await connectDB();
    const existing = await users.countDocuments();
    const isBootstrap = existing === 0;

    if (!isBootstrap) {
      const me = await getCurrentUser();
      if (!me || me.role !== 'admin') {
        return NextResponse.json(
          { error: 'Only admins can create new users' },
          { status: 403 }
        );
      }
    }

    const normalized = email.toLowerCase().trim();
    const dupe = await users.findOne({ email: normalized });
    if (dupe) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const doc = await users.create({
      email: normalized,
      passwordHash,
      name: typeof name === 'string' && name.trim() ? name.trim() : null,
      role: isBootstrap ? 'admin' : 'user',
      isActive: true,
      sessionEpoch: 0,
    });

    if (isBootstrap) {
      // Auto-login on first signup
      doc.lastLoginAt = new Date();
      await doc.save();

      const token = await signSession({
        sub: doc.id,
        eml: doc.email,
        role: 'admin',
        ep: 0,
      });
      const res = NextResponse.json({
        ok: true,
        bootstrap: true,
        user: { id: doc.id, email: doc.email, name: doc.name, role: 'admin' },
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
    }

    return NextResponse.json({
      ok: true,
      bootstrap: false,
      user: { id: doc.id, email: doc.email, name: doc.name, role: doc.role },
    });
  } catch (err) {
    console.error('register error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Register failed' },
      { status: 500 }
    );
  }
}
