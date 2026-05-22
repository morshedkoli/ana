/**
 * Catbox.moe — free anonymous image hosting, NO API key required.
 *
 * Endpoint: POST https://catbox.moe/user/api.php  (multipart/form-data)
 *   reqtype=fileupload
 *   fileToUpload=<file>
 *
 * Returns the public URL as the response body (text/plain).
 */
import type {
  HostingProviderModule, UploadInput, UploadResult,
} from '../types';

export const catbox: HostingProviderModule = {
  meta: {
    id: 'catbox',
    name: 'Catbox.moe',
    description: 'Anonymous uploads, no key required. 200 MB max per file.',
    homepageUrl: 'https://catbox.moe',
    requiresKey: false,
    capabilities: { upload: true, delete: false, listRemote: false },
    freeTier: 'Anonymous uploads, 200 MB per file',
  },

  async upload({ buffer, filename, contentType }: UploadInput): Promise<UploadResult> {
    const fd = new FormData();
    fd.append('reqtype', 'fileupload');
    const blob = new Blob([new Uint8Array(buffer)], { type: contentType || 'image/png' });
    fd.append('fileToUpload', blob, filename);

    const res = await fetch('https://catbox.moe/user/api.php', {
      method: 'POST', body: fd,
    });
    if (!res.ok) throw new Error(`Catbox error ${res.status}: ${await res.text()}`);
    const url = (await res.text()).trim();
    if (!url.startsWith('http')) throw new Error(`Catbox returned: ${url}`);
    return {
      url,
      remoteId: url.split('/').pop() || url,
      bytes: buffer.length,
    };
  },
};
