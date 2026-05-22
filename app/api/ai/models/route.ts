import { NextRequest, NextResponse } from 'next/server';
import { listAllModels } from '@/lib/ai/providers/registry';

/**
 * GET /api/ai/models?kind=image|text
 * Aggregates models from every provider (using each provider's stored creds).
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const kindParam = url.searchParams.get('kind');
  const kind = kindParam === 'image' || kindParam === 'text' ? kindParam : undefined;
  const models = await listAllModels(kind ? { kind } : undefined);
  return NextResponse.json({ models });
}
