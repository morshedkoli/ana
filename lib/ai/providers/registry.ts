/**
 * Provider registry — single entry point.
 *
 * Looks up provider modules, resolves stored credentials from the settings
 * collection, and exposes high-level generate/listModels helpers.
 */
import { connectDB, settings } from '@/lib/db/client';
import type {
  ProviderId, ProviderModule, AIModel, ProviderCreds, ProviderMeta,
  ImageGenResult, TextGenResult, TextMessage,
} from './types';
import { pollinations } from './pollinations';
import { cloudflare, packCloudflareKey } from './cloudflare';
import { huggingface } from './huggingface';
import { openrouter } from './openrouter';
import { groq } from './groq';
import { gemini } from './gemini';

export const PROVIDERS: Record<ProviderId, ProviderModule> = {
  pollinations,
  cloudflare,
  huggingface,
  openrouter,
  groq,
  gemini,
};

export function listProviderMetas(): ProviderMeta[] {
  return Object.values(PROVIDERS).map((p) => p.meta);
}

export function getProvider(id: ProviderId): ProviderModule {
  const p = PROVIDERS[id];
  if (!p) throw new Error(`Unknown provider: ${id}`);
  return p;
}

/* ============================================================
   Settings-key conventions
   ============================================================ */
function keyName(provider: ProviderId): string { return `ai_key_${provider}`; }
function accountKeyName(provider: ProviderId): string { return `ai_account_${provider}`; }

export async function saveProviderCreds(provider: ProviderId, creds: ProviderCreds): Promise<void> {
  await connectDB();
  await settings.findOneAndUpdate(
    { key: keyName(provider) },
    { $set: { value: creds.apiKey ?? '', updatedAt: new Date() } },
    { upsert: true }
  );
  if (PROVIDERS[provider].meta.requiresAccount) {
    await settings.findOneAndUpdate(
      { key: accountKeyName(provider) },
      { $set: { value: creds.apiAccount ?? '', updatedAt: new Date() } },
      { upsert: true }
    );
  }
}

export async function clearProviderCreds(provider: ProviderId): Promise<void> {
  await connectDB();
  await settings.deleteOne({ key: keyName(provider) });
  if (PROVIDERS[provider].meta.requiresAccount) {
    await settings.deleteOne({ key: accountKeyName(provider) });
  }
}

export async function getProviderCreds(provider: ProviderId): Promise<ProviderCreds> {
  await connectDB();
  const [keyDoc, acctDoc] = await Promise.all([
    settings.findOne({ key: keyName(provider) }),
    PROVIDERS[provider].meta.requiresAccount
      ? settings.findOne({ key: accountKeyName(provider) }) : null,
  ]);
  // Backward compat: legacy cloudflare keys
  if (provider === 'cloudflare' && (!keyDoc || !keyDoc.value)) {
    const legacyKey = await settings.findOne({ key: 'cloudflare_api_token' });
    const legacyAcct = await settings.findOne({ key: 'cloudflare_account_id' });
    return {
      apiKey: (legacyKey?.value as string) || process.env.CLOUDFLARE_API_TOKEN || '',
      apiAccount: (legacyAcct?.value as string) || process.env.CLOUDFLARE_ACCOUNT_ID || '',
    };
  }
  return {
    apiKey: (keyDoc?.value as string) || process.env[`AI_KEY_${provider.toUpperCase()}`] || '',
    apiAccount: (acctDoc?.value as string) || '',
  };
}

export async function isProviderConfigured(provider: ProviderId): Promise<boolean> {
  const meta = PROVIDERS[provider].meta;
  if (!meta.requiresKey) return true;
  const c = await getProviderCreds(provider);
  if (!c.apiKey) return false;
  if (meta.requiresAccount && !c.apiAccount) return false;
  return true;
}

/* ============================================================
   Public helpers used by API routes
   ============================================================ */

export async function listAllModels(filter?: { kind?: 'image' | 'text' }): Promise<AIModel[]> {
  const out: AIModel[] = [];
  await Promise.all(Object.values(PROVIDERS).map(async (p) => {
    let models: AIModel[] = [];
    try {
      const creds = await getProviderCreds(p.meta.id);
      models = p.listModels ? await p.listModels(creds) : (p.meta.defaultModels ?? []);
    } catch {
      models = p.meta.defaultModels ?? [];
    }
    for (const m of models) {
      if (filter?.kind && m.kind !== filter.kind) continue;
      out.push(m);
    }
  }));
  return out;
}

export async function listProviderModels(
  provider: ProviderId, filter?: { kind?: 'image' | 'text' }
): Promise<AIModel[]> {
  const p = getProvider(provider);
  const creds = await getProviderCreds(provider);
  const models = p.listModels ? await p.listModels(creds) : (p.meta.defaultModels ?? []);
  return filter?.kind ? models.filter((m) => m.kind === filter.kind) : models;
}

export async function generateImageWith(
  provider: ProviderId,
  opts: { prompt: string; model?: string; width?: number; height?: number; seed?: number; negativePrompt?: string }
): Promise<ImageGenResult> {
  const p = getProvider(provider);
  if (!p.generateImage) throw new Error(`${provider} does not support image generation`);
  const creds = await getProviderCreds(provider);
  return p.generateImage({
    prompt: opts.prompt,
    model: opts.model || (p.meta.defaultModels ?? []).find((m) => m.kind === 'image')?.id || '',
    width: opts.width, height: opts.height, seed: opts.seed,
    negativePrompt: opts.negativePrompt,
    apiKey: creds.apiKey, apiAccount: creds.apiAccount,
  });
}

export async function generateTextWith(
  provider: ProviderId,
  opts: { messages: TextMessage[]; model?: string; temperature?: number; maxTokens?: number }
): Promise<TextGenResult> {
  const p = getProvider(provider);
  if (!p.generateText) throw new Error(`${provider} does not support text generation`);
  const creds = await getProviderCreds(provider);

  // Cloudflare needs both account+token packed into apiKey for our generateText signature
  let apiKey = creds.apiKey;
  if (provider === 'cloudflare') {
    if (!creds.apiAccount || !creds.apiKey) throw new Error('Cloudflare needs Account ID + token');
    apiKey = packCloudflareKey(creds.apiAccount, creds.apiKey);
  }

  return p.generateText({
    messages: opts.messages,
    model: opts.model || (p.meta.defaultModels ?? []).find((m) => m.kind === 'text')?.id || '',
    temperature: opts.temperature, maxTokens: opts.maxTokens, apiKey,
  });
}
