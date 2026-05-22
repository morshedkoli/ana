/**
 * Shared types for image-hosting providers.
 *
 * Each module exports a {@link HostingProviderModule} that conforms to a
 * subset of these capabilities. The registry lazy-loads creds from the
 * settings collection (`image_host_key_{id}`, `image_host_account_{id}`).
 */

export type HostingProviderId = 'local' | 'cloudinary' | 'imgbb' | 'imgur' | 'catbox';

export interface HostingProviderMeta {
  id: HostingProviderId;
  name: string;
  description: string;
  homepageUrl: string;
  keysHelp?: string;
  /** False for `local` and `catbox` (anonymous). */
  requiresKey: boolean;
  /** Cloudinary needs cloud_name + api_key + api_secret packed in apiKey/apiAccount. */
  requiresAccount?: boolean;
  capabilities: {
    upload: boolean;
    delete: boolean;
    listRemote: boolean;
  };
  /** Free tier description for the UI. */
  freeTier?: string;
}

export interface HostingCreds {
  apiKey?: string;
  apiAccount?: string;
}

export interface UploadInput {
  /** Raw image bytes. */
  buffer: Buffer;
  /** Original filename (used for the suggested public id / extension). */
  filename: string;
  /** Optional content type (defaults to image/png). */
  contentType?: string;
  apiKey?: string;
  apiAccount?: string;
}

export interface UploadResult {
  /** Public URL of the hosted image. */
  url: string;
  /** Provider-specific id used for delete. */
  remoteId?: string;
  /** Optional delete URL (Imgur's deleteHash, etc.). */
  deleteUrl?: string;
  /** Provider-specific extra metadata to persist. */
  metadata?: Record<string, unknown>;
  /** Bytes uploaded (for accounting). */
  bytes?: number;
}

export interface RemoteImage {
  url: string;
  remoteId: string;
  thumbnailUrl?: string;
  bytes?: number;
  createdAt?: string;
  width?: number;
  height?: number;
}

export interface DeleteInput {
  remoteId: string;
  deleteUrl?: string;
  apiKey?: string;
  apiAccount?: string;
}

export interface HostingProviderModule {
  meta: HostingProviderMeta;
  upload?(input: UploadInput): Promise<UploadResult>;
  delete?(input: DeleteInput): Promise<void>;
  listRemote?(creds: HostingCreds, opts?: { limit?: number }): Promise<RemoteImage[]>;
}
