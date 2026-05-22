import { NextResponse } from 'next/server';
import {
  listHostMetas, getHostCreds, isHostConfigured, getDefaultHost,
} from '@/lib/hosting/registry';
import type { HostingProviderId } from '@/lib/hosting/types';

/**
 * GET /api/image-hosts
 * Returns metadata for every image-host provider plus configuration state
 * and the currently selected default host.
 */
export async function GET() {
  const metas = listHostMetas();
  const defaultHost = await getDefaultHost();
  const hosts = await Promise.all(metas.map(async (m) => {
    const creds = await getHostCreds(m.id as HostingProviderId);
    return {
      ...m,
      configured: await isHostConfigured(m.id as HostingProviderId),
      hasKey: Boolean(creds.apiKey),
      hasAccount: Boolean(creds.apiAccount),
      account: creds.apiAccount || '', // non-sensitive (e.g. cloudinary cloud_name)
    };
  }));
  return NextResponse.json({ hosts, defaultHost });
}
