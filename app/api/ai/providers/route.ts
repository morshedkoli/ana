import { NextResponse } from 'next/server';
import {
  listProviderMetas, getProviderCreds, isProviderConfigured,
} from '@/lib/ai/providers/registry';
import type { ProviderId } from '@/lib/ai/providers/types';

/**
 * GET /api/ai/providers
 * Returns metadata for every provider plus whether the user has configured it.
 */
export async function GET() {
  const metas = listProviderMetas();
  const out = await Promise.all(metas.map(async (m) => {
    const creds = await getProviderCreds(m.id as ProviderId);
    return {
      ...m,
      configured: await isProviderConfigured(m.id as ProviderId),
      hasKey: Boolean(creds.apiKey),
      hasAccount: Boolean(creds.apiAccount),
    };
  }));
  return NextResponse.json({ providers: out });
}
