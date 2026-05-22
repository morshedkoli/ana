import { redirect } from 'next/navigation';
import { getCurrentUser, hasAnyUser } from '@/lib/auth/server';
import { LoginForm } from './login-form';

export const dynamic = 'force-dynamic';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; mode?: string }>;
}) {
  const me = await getCurrentUser();
  if (me) redirect('/');

  const params = await searchParams;
  const isBootstrap = !(await hasAnyUser());

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <LoginForm
        bootstrap={isBootstrap}
        nextPath={params.next || '/'}
        defaultMode={params.mode === 'register' || isBootstrap ? 'register' : 'login'}
      />
    </div>
  );
}
