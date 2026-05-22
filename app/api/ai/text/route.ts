import { NextRequest, NextResponse } from 'next/server';
import { generateTextWith, PROVIDERS } from '@/lib/ai/providers/registry';
import type { ProviderId, TextMessage } from '@/lib/ai/providers/types';

/**
 * POST /api/ai/text
 * Body: { provider, model, messages|prompt, temperature?, maxTokens? }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const provider = body.provider as ProviderId;
    if (!provider || !Object.keys(PROVIDERS).includes(provider)) {
      return NextResponse.json({ error: 'Valid provider required' }, { status: 400 });
    }
    let messages: TextMessage[] = body.messages;
    if (!messages && typeof body.prompt === 'string') {
      messages = [{ role: 'user', content: body.prompt }];
    }
    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'messages or prompt required' }, { status: 400 });
    }
    const result = await generateTextWith(provider, {
      messages, model: body.model,
      temperature: body.temperature, maxTokens: body.maxTokens,
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'failed' },
      { status: 500 }
    );
  }
}
