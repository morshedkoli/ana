import { NextRequest, NextResponse } from 'next/server';
import { listProviderModels, PROVIDERS } from '@/lib/ai/providers/registry';
import type { ProviderId } from '@/lib/ai/providers/types';

/**
 * GET /api/ai/providers/{id}/models?kind=image|text
 * Live-fetches models from the provider using the stored credentials.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!Object.keys(PROVIDERS).includes(id)) {
      return NextResponse.json({ error: `Unknown provider: ${id}` }, { status: 400 });
    }
    const url = new URL(req.url);
    const kindParam = url.searchParams.get('kind');
    const kind = kindParam === 'image' || kindParam === 'text' ? kindParam : undefined;
    const models = await listProviderModels(id as ProviderId, kind ? { kind } : undefined);
    return NextResponse.json({ models });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'failed', models: [] },
      { status: 500 }
    );
  }
}
