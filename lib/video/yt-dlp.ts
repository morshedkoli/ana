/**
 * yt-dlp wrapper for TikTok / YouTube / Instagram metadata + downloads.
 * Requires: pip install yt-dlp  OR  apt install yt-dlp
 */

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const VIDEOS_DIR = path.join(process.cwd(), 'storage', 'videos');
const THUMBS_DIR = path.join(process.cwd(), 'storage', 'thumbnails');

function ensureDirs() {
  for (const d of [VIDEOS_DIR, THUMBS_DIR]) {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  }
}

export interface VideoMeta {
  id: string;
  url: string;
  platform: string;
  title: string;
  description: string;
  uploader: string;
  uploadDate: string;
  duration: number;
  viewCount: number;
  likeCount: number;
  thumbnail: string;
  hashtags: string[];
  audioName?: string;
  raw: Record<string, unknown>;
}

function detectPlatform(url: string): string {
  if (/tiktok\.com/.test(url)) return 'tiktok';
  if (/youtube\.com|youtu\.be/.test(url)) return 'youtube';
  if (/instagram\.com/.test(url)) return 'instagram';
  return 'unknown';
}

function extractHashtags(text: string): string[] {
  const matches = text.match(/#[\p{L}\p{N}_]+/gu) || [];
  return Array.from(new Set(matches));
}

/**
 * Fetch metadata only (no download). Fast.
 */
export async function fetchVideoMeta(url: string): Promise<VideoMeta> {
  return new Promise((resolve, reject) => {
    const proc = spawn('yt-dlp', ['--dump-json', '--no-warnings', '--no-playlist', url]);
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (c) => { stdout += c.toString(); });
    proc.stderr.on('data', (c) => { stderr += c.toString(); });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code !== 0) return reject(new Error(`yt-dlp failed: ${stderr.slice(-500)}`));
      try {
        const j = JSON.parse(stdout);
        const description = j.description || '';
        const title = j.title || '';
        const hashtags = extractHashtags(`${title} ${description}`);
        resolve({
          id: j.id,
          url: j.webpage_url || url,
          platform: detectPlatform(url),
          title,
          description,
          uploader: j.uploader || j.uploader_id || '',
          uploadDate: j.upload_date || '',
          duration: j.duration || 0,
          viewCount: j.view_count || 0,
          likeCount: j.like_count || 0,
          thumbnail: j.thumbnail || '',
          hashtags,
          audioName: j.track || j.music?.title,
          raw: j,
        });
      } catch (e) {
        reject(new Error(`Failed to parse yt-dlp output: ${e}`));
      }
    });
  });
}

/**
 * Download the thumbnail image only. Saves to storage/thumbnails.
 */
export async function downloadThumbnail(url: string): Promise<string> {
  ensureDirs();
  const meta = await fetchVideoMeta(url);
  if (!meta.thumbnail) throw new Error('No thumbnail available');

  const res = await fetch(meta.thumbnail);
  if (!res.ok) throw new Error('Thumbnail fetch failed');
  const buf = Buffer.from(await res.arrayBuffer());

  const fileName = `${Date.now()}_${crypto.randomBytes(3).toString('hex')}.jpg`;
  const filePath = path.join(THUMBS_DIR, fileName);
  fs.writeFileSync(filePath, buf);
  return `/storage/thumbnails/${fileName}`;
}

/**
 * Download the full video to disk.
 */
export async function downloadVideo(url: string): Promise<string> {
  ensureDirs();
  const fileName = `${Date.now()}_${crypto.randomBytes(3).toString('hex')}.mp4`;
  const outPath = path.join(VIDEOS_DIR, fileName);

  return new Promise((resolve, reject) => {
    const proc = spawn('yt-dlp', [
      '-f', 'mp4/best',
      '-o', outPath,
      '--no-warnings',
      '--no-playlist',
      url,
    ]);
    let stderr = '';
    proc.stderr.on('data', (c) => { stderr += c.toString(); });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code !== 0) return reject(new Error(`yt-dlp download failed: ${stderr.slice(-500)}`));
      resolve(outPath);
    });
  });
}
