/**
 * Local filesystem "host" — writes bytes to /storage/images and returns
 * a /storage/... URL handled by /api/storage/[...path].
 *
 * Provided so the uploaded-image flow can stay unified across providers,
 * and so users with no API keys still get a working library.
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { HostingProviderModule, UploadResult } from '../types';

const IMAGES_DIR = path.join(process.cwd(), 'storage', 'images');

function ensureDir() {
  if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

export const localHost: HostingProviderModule = {
  meta: {
    id: 'local',
    name: 'Local filesystem',
    description: 'Stored on this server in /storage/images. No upload, no quota.',
    homepageUrl: '#',
    requiresKey: false,
    capabilities: { upload: true, delete: true, listRemote: false },
    freeTier: 'Disk-bound only',
  },

  async upload({ buffer, filename }): Promise<UploadResult> {
    ensureDir();
    const ext = path.extname(filename) || '.png';
    const fileName = `${Date.now()}_local_${crypto.randomBytes(3).toString('hex')}${ext}`;
    const filePath = path.join(IMAGES_DIR, fileName);
    fs.writeFileSync(filePath, buffer);
    return {
      url: `/storage/images/${fileName}`,
      remoteId: filePath,
      bytes: buffer.length,
    };
  },

  async delete({ remoteId }): Promise<void> {
    if (remoteId && fs.existsSync(remoteId)) {
      try { fs.unlinkSync(remoteId); } catch { /* ignore */ }
    }
  },
};
