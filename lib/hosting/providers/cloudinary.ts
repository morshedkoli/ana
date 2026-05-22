/**
 * Cloudinary image hosting.
 *
 * Free tier: 25 GB storage + 25 GB bandwidth/month.
 *
 * Auth uses the standard {api_key:api_secret@cloud_name} approach via the
 * v1_1 REST endpoint. We pack creds as:
 *  - apiAccount  →  cloud_name
 *  - apiKey      →  "{api_key}:{api_secret}"
 *
 * Endpoints:
 *  - POST  https://api.cloudinary.com/v1_1/{cloud}/image/upload
 *  - GET   https://api.cloudinary.com/v1_1/{cloud}/resources/image
 *  - POST  https://api.cloudinary.com/v1_1/{cloud}/resources/image/destroy
 */
import crypto from 'crypto';
import type {
  HostingProviderModule, UploadInput, UploadResult, DeleteInput,
  RemoteImage, HostingCreds,
} from '../types';

interface CloudinaryUploadResponse {
  secure_url: string;
  public_id: string;
  bytes?: number;
  width?: number;
  height?: number;
  format?: string;
  created_at?: string;
}

function parseCreds(apiKey?: string, apiAccount?: string) {
  if (!apiKey || !apiAccount) {
    throw new Error('Cloudinary requires cloud_name + api_key + api_secret. Configure in the library.');
  }
  const [key, secret] = apiKey.split(':');
  if (!key || !secret) {
    throw new Error('Cloudinary key must be formatted as "api_key:api_secret".');
  }
  return { cloudName: apiAccount, apiKey: key, apiSecret: secret };
}

/** Cloudinary signature: SHA-1 of sorted-params + api_secret. */
function signParams(params: Record<string, string | number | undefined>, apiSecret: string): string {
  const filtered: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === '' || k === 'file' || k === 'api_key' || k === 'resource_type') continue;
    filtered[k] = v as string | number;
  }
  const sorted = Object.keys(filtered).sort()
    .map((k) => `${k}=${filtered[k]}`)
    .join('&');
  return crypto.createHash('sha1').update(sorted + apiSecret).digest('hex');
}

export const cloudinary: HostingProviderModule = {
  meta: {
    id: 'cloudinary',
    name: 'Cloudinary',
    description: 'Free 25 GB storage + 25 GB bandwidth/month with transforms and CDN.',
    homepageUrl: 'https://console.cloudinary.com/settings/api-keys',
    keysHelp:
      'Sign up free at cloudinary.com. Then go to Settings → API Keys. ' +
      'Cloud name goes in the first field; "api_key:api_secret" goes in the API key field.',
    requiresKey: true,
    requiresAccount: true,
    capabilities: { upload: true, delete: true, listRemote: true },
    freeTier: '25 GB storage + 25 GB bandwidth/month',
  },

  async upload({ buffer, filename, contentType, apiKey, apiAccount }: UploadInput): Promise<UploadResult> {
    const { cloudName, apiKey: key, apiSecret } = parseCreds(apiKey, apiAccount);
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = 'influencer-studio';
    const publicId = `${Date.now()}_${filename.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9-_]/g, '_')}`;

    const sigParams = { folder, public_id: publicId, timestamp };
    const signature = signParams(sigParams, apiSecret);

    const fd = new FormData();
    const blob = new Blob([new Uint8Array(buffer)], { type: contentType || 'image/png' });
    fd.append('file', blob, filename);
    fd.append('api_key', key);
    fd.append('timestamp', String(timestamp));
    fd.append('folder', folder);
    fd.append('public_id', publicId);
    fd.append('signature', signature);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: fd,
    });
    if (!res.ok) throw new Error(`Cloudinary upload error ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as CloudinaryUploadResponse;
    return {
      url: data.secure_url,
      remoteId: data.public_id,
      bytes: data.bytes,
      metadata: { width: data.width, height: data.height, format: data.format, createdAt: data.created_at },
    };
  },

  async delete({ remoteId, apiKey, apiAccount }: DeleteInput): Promise<void> {
    const { cloudName, apiKey: key, apiSecret } = parseCreds(apiKey, apiAccount);
    const timestamp = Math.floor(Date.now() / 1000);
    const sig = signParams({ public_id: remoteId, timestamp }, apiSecret);

    const fd = new FormData();
    fd.append('public_id', remoteId);
    fd.append('api_key', key);
    fd.append('timestamp', String(timestamp));
    fd.append('signature', sig);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
      method: 'POST', body: fd,
    });
    if (!res.ok) throw new Error(`Cloudinary delete error ${res.status}`);
  },

  async listRemote(creds: HostingCreds, opts?: { limit?: number }): Promise<RemoteImage[]> {
    const { cloudName, apiKey: key, apiSecret } = parseCreds(creds.apiKey, creds.apiAccount);
    const max = Math.min(opts?.limit ?? 50, 100);
    const url = new URL(`https://api.cloudinary.com/v1_1/${cloudName}/resources/image`);
    url.searchParams.set('max_results', String(max));
    url.searchParams.set('type', 'upload');

    const auth = Buffer.from(`${key}:${apiSecret}`).toString('base64');
    const res = await fetch(url, { headers: { Authorization: `Basic ${auth}` } });
    if (!res.ok) throw new Error(`Cloudinary list error ${res.status}`);
    const data = (await res.json()) as {
      resources: Array<{
        public_id: string; secure_url: string; bytes?: number;
        created_at?: string; width?: number; height?: number;
      }>;
    };
    return data.resources.map<RemoteImage>((r) => ({
      url: r.secure_url, remoteId: r.public_id,
      thumbnailUrl: r.secure_url.replace('/upload/', '/upload/c_fill,w_300,h_400,q_auto,f_auto/'),
      bytes: r.bytes, createdAt: r.created_at,
      width: r.width, height: r.height,
    }));
  },
};
