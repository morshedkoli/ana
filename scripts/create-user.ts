/**
 * Create or update a user account from the command line.
 *
 * Usage:
 *   npm run create-user -- <email> <password> [name] [--role=admin|user]
 *
 * Examples:
 *   npm run create-user -- alice@example.com hunter2alpha
 *   npm run create-user -- bob@example.com hunter2alpha "Bob Smith" --role=admin
 *
 * If the email already exists, updates the password instead of creating a
 * duplicate. The first user created is always promoted to admin (matches
 * the bootstrap flow in the web UI).
 */
import { connectDB, users } from '@/lib/db/client';
import { hashPassword } from '@/lib/auth/password';

async function main() {
  const args = process.argv.slice(2);
  const flags: Record<string, string> = {};
  const positional: string[] = [];
  for (const a of args) {
    if (a.startsWith('--')) {
      const [k, v = 'true'] = a.slice(2).split('=');
      flags[k] = v;
    } else {
      positional.push(a);
    }
  }

  const [email, password, ...nameParts] = positional;
  if (!email || !password) {
    console.error('Usage: npm run create-user -- <email> <password> [name] [--role=admin|user]');
    process.exit(2);
  }

  await connectDB();

  const total = await users.countDocuments();
  const existing = await users.findOne({ email: email.toLowerCase().trim() });
  const passwordHash = await hashPassword(password);

  // First user is always admin; explicit --role wins otherwise; default 'user'
  const role: 'admin' | 'user' =
    flags.role === 'admin' || flags.role === 'user'
      ? (flags.role as 'admin' | 'user')
      : (total === 0 || existing?.role === 'admin' ? 'admin' : 'user');

  if (existing) {
    existing.passwordHash = passwordHash;
    if (nameParts.length) existing.name = nameParts.join(' ');
    if (flags.role) existing.role = role;
    existing.isActive = true;
    existing.sessionEpoch = (existing.sessionEpoch ?? 0) + 1; // invalidate old sessions
    await existing.save();
    console.log(`✓ Updated user ${existing.email} (role=${existing.role}). All previous sessions invalidated.`);
  } else {
    const created = await users.create({
      email: email.toLowerCase().trim(),
      passwordHash,
      name: nameParts.length ? nameParts.join(' ') : null,
      role,
      isActive: true,
      sessionEpoch: 0,
    });
    console.log(`✓ Created user ${created.email} (role=${created.role})`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('FAILED:', err.message || err);
  process.exit(1);
});
