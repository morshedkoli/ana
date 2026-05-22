/**
 * Imgur — free image hosting via their public API.
 *
 * Anonymous mode (Client-ID only) is the simplest: you only need a Client ID
 * registered on api.imgur.com (free, no OAuth flow needed for anonymous uploads).
 *
 * Endpoint: POST https://api.imgur.com/3/image
 *           DELETE https://api.imgur.com/3/image/{deleteHash}
 */
import type {
  HostingProviderModule, UploadInput, UploadResult, DeleteInput,
} from '../types';

interface ImgurResponse<T> { data: T; success: boolean; status: number }
interface ImgurImageData {
  id: string; deletehash?: string; link: string; size?: number;
  width?: number; height?: number; type?: string;
}

export const imgur: HostingProviderModule = {
  meta: {
    id: 'imgur',
    name: 'Imgur',
    description: 'Anonymous uploads with a Client ID — no account/login required for users.',
    homepageUrl: 'https://api.imgur.com/oauth2/addclient',
    keysHelp:
      'Register a free app at api.imgur.com/oauth2/addclient (choose "Anonymous usage without user authorization"). ' +
      'Use the resulting Client-ID as the key.',
    requiresKey: true,
    capabilities: { upload: true, delete: true, listRemote: false },
    freeTier: '~1,250 uploads/day per Client-ID',
  },

  async upload({ buffer, filename, apiKey }: UploadInput): Promise<UploadResult> {
    if (!apiKey) throw new Error('Imgur requires a Client-ID.');
    const fd = new FormData();
    fd.append('image', buffer.toString('base64'));
    fd.append('type', 'base64');
    fd.append('name', filename);

    const res = await fetch('https://api.imgur.com/3/image', {
      method: 'POST',
      headers: { Authorization: `Client-ID ${apiKey}` },
      body: fd,
    });
    if (!res.ok) throw new Error(`Imgur error ${res.status}: ${await res.text()}`);
    const json = (await res.json()) as ImgurResponse<ImgurImageData>;
    if (!json.success) throw new Error('Imgur returned !success');
    return {
      url: json.data.link,
      remoteId: json.data.id,
      deleteUrl: json.data.deletehash,
      bytes: json.data.size,
      metadata: { width: json.data.width, height: json.data.height, type: json.data.type },
    };
  },

  async delete({ deleteUrl, apiKey }: DeleteInput): Promise<void> {
    if (!deleteUrl || !apiKey) return;
    await fetch(`https://api.imgur.com/3/image/${deleteUrl}`, {
      method: 'DELETE',
      headers: { Authorization: `Client-ID ${apiKey}` },
    });
  },
};
