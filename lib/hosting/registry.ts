/**
 * Image hosting provider registry.
 * Stores creds in the existing settings collection.
 *
 * Settings keys:
 *  - image_host_key_{id}     → API key (or "api_key:api_secret" for cloudinary)
 *  - image_host_account_{id} → cloud_name (cloudinary only)
 *  - image_host_default      → preferred provider id
 */
import { connectDB, settings } from '@/lib/db/client';
import type {
  HostingProviderId, HostingProviderModule, HostingProviderMeta,
  HostingCreds, UploadResult, RemoteImage,
} from './types';
import { localHost } from './providers/local';
import { cloudinary } from './providers/cloudinary';
import { imgbb } from './providers/imgbb';
import { imgur } from './providers/imgur';
import { catbox } from './providers/catbox';

export const HOSTS: Record<HostingProviderId, HostingProviderModule> = {
  local: localHost,
  cloudinary,
  imgbb,
  imgur,
  catbox,
};

const DEFAULT_KEY = 'image_host_default';
const DEFAULT_PROVIDER: HostingProviderId = 'local';

function keyName(id: HostingProviderId) { return `image_host_key_${id}`; }
function accountKeyName(id: HostingProviderId) { return `image_host_account_${id}`; }

export function listHostMetas(): HostingProviderMeta[] {
  return Object.values(HOSTS).map((h) => h.meta);
}

export function getHost(id: HostingProviderId): HostingProviderModule {
  const h = HOSTS[id];
  if (!h) throw new Error(`Unknown image host: ${id}`);
  return h;
}

export async function saveHostCreds(id: HostingProviderId, creds: HostingCreds): Promise<void> {
  await connectDB();
  await settings.findOneAndUpdate(
    { key: keyName(id) },
    { $set: { value: creds.apiKey ?? '', updatedAt: new Date() } },
    { upsert: true }
  );
  if (HOSTS[id].meta.requiresAccount) {
    await settings.findOneAndUpdate(
      { key: accountKeyName(id) },
      { $set: { value: creds.apiAccount ?? '', updatedAt: new Date() } },
      { upsert: true }
    );
  }
}

export async function clearHostCreds(id: HostingProviderId): Promise<void> {
  await connectDB();
  await settings.deleteOne({ key: keyName(id) });
  if (HOSTS[id].meta.requiresAccount) {
    await settings.deleteOne({ key: accountKeyName(id) });
  }
}

export async function getHostCreds(id: HostingProviderId): Promise<HostingCreds> {
  await connectDB();
  const [keyDoc, acctDoc] = await Promise.all([
    settings.findOne({ key: keyName(id) }),
    HOSTS[id].meta.requiresAccount ? settings.findOne({ key: accountKeyName(id) }) : null,
  ]);
  return {
    apiKey: (keyDoc?.value as string) || '',
    apiAccount: (acctDoc?.value as string) || '',
  };
}

export async function isHostConfigured(id: HostingProviderId): Promise<boolean> {
  const meta = HOSTS[id].meta;
  if (!meta.requiresKey) return true;
  const c = await getHostCreds(id);
  if (!c.apiKey) return false;
  if (meta.requiresAccount && !c.apiAccount) return false;
  return true;
}

export async function getDefaultHost(): Promise<HostingProviderId> {
  await connectDB();
  const doc = await settings.findOne({ key: DEFAULT_KEY });
  const value = (doc?.value as HostingProviderId) || DEFAULT_PROVIDER;
  return Object.keys(HOSTS).includes(value) ? value : DEFAULT_PROVIDER;
}

export async function setDefaultHost(id: HostingProviderId): Promise<void> {
  await connectDB();
  await settings.findOneAndUpdate(
    { key: DEFAULT_KEY },
    { $set: { value: id, updatedAt: new Date() } },
    { upsert: true }
  );
}

/* ============================================================
   High-level helpers used by API routes
   ============================================================ */

export async function uploadToHost(
  id: HostingProviderId,
  input: { buffer: Buffer; filename: string; contentType?: string }
): Promise<UploadResult & { provider: HostingProviderId }> {
  const h = getHost(id);
  if (!h.upload) throw new Error(`${id} doesn't support upload`);
  const creds = await getHostCreds(id);
  const result = await h.upload({
    buffer: input.buffer, filename: input.filename, contentType: input.contentType,
    apiKey: creds.apiKey, apiAccount: creds.apiAccount,
  });
  return { ...result, provider: id };
}

export async function deleteFromHost(
  id: HostingProviderId,
  remoteId: string,
  deleteUrl?: string
): Promise<void> {
  const h = getHost(id);
  if (!h.delete) return;
  const creds = await getHostCreds(id);
  await h.delete({
    remoteId, deleteUrl,
    apiKey: creds.apiKey, apiAccount: creds.apiAccount,
  });
}

export async function listRemoteImages(
  id: HostingProviderId, opts?: { limit?: number }
): Promise<RemoteImage[]> {
  const h = getHost(id);
  if (!h.listRemote) return [];
  const creds = await getHostCreds(id);
  return h.listRemote(creds, opts);
}
