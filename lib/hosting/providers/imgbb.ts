/**
 * ImgBB image hosting — completely free, lightweight, simple key-based API.
 *
 * Endpoint: POST https://api.imgbb.com/1/upload?key={KEY}
 * No list / delete API exposed for free accounts.
 */
import type {
  HostingProviderModule, UploadInput, UploadResult,
} from '../types';

interface ImgBBResponse {
  data: {
    id: string; url: string; display_url: string; size: number;
    delete_url?: string; image: { url: string; mime?: string };
    width?: number; height?: number;
  };
  success: boolean;
}

export const imgbb: HostingProviderModule = {
  meta: {
    id: 'imgbb',
    name: 'ImgBB',
    description: 'Free, simple image hosting with direct CDN URLs.',
    homepageUrl: 'https://api.imgbb.com',
    keysHelp: 'Get a free key at api.imgbb.com (top right "Get API key").',
    requiresKey: true,
    capabilities: { upload: true, delete: false, listRemote: false },
    freeTier: 'Unlimited storage, 32 MB per image',
  },

  async upload({ buffer, filename, apiKey }: UploadInput): Promise<UploadResult> {
    if (!apiKey) throw new Error('ImgBB requires an API key.');
    const fd = new FormData();
    const b64 = buffer.toString('base64');
    fd.append('image', b64);
    fd.append('name', filename.replace(/\.[^.]+$/, ''));

    const res = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: 'POST', body: fd,
    });
    if (!res.ok) throw new Error(`ImgBB error ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as ImgBBResponse;
    if (!data.success) throw new Error('ImgBB returned !success');
    return {
      url: data.data.url,
      remoteId: data.data.id,
      deleteUrl: data.data.delete_url,
      bytes: data.data.size,
      metadata: {
        displayUrl: data.data.display_url,
        width: data.data.width, height: data.data.height,
      },
    };
  },
};
