/**
 * yt-dlp wrapper for TikTok / YouTube / Instagram metadata + downloads.
 * Requires: pip install yt-dlp  (or apt install yt-dlp)
 */

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import { resolveYtDlp } from './yt-dlp-binary';
import { getFfmpegDirSync } from './ffmpeg-binary';

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

export interface DownloadResult {
  meta: VideoMeta;
  /** Public URL path under /storage/videos/<file>.mp4 */
  videoPublicPath: string;
  /** Absolute path on disk */
  videoFilePath: string;
  /** Public URL path under /storage/thumbnails/<file>.jpg, if available */
  thumbnailPublicPath?: string;
  /** Absolute path on disk to the saved thumbnail */
  thumbnailFilePath?: string;
  bytes: number;
}

function detectPlatform(url: string): string {
  if (/tiktok\.com/.test(url)) return 'tiktok';
  if (/youtube\.com|youtu\.be/.test(url)) return 'youtube';
  if (/instagram\.com/.test(url)) return 'instagram';
  if (/twitter\.com|x\.com/.test(url)) return 'twitter';
  if (/facebook\.com|fb\.watch/.test(url)) return 'facebook';
  return 'unknown';
}

function extractHashtags(text: string): string[] {
  const matches = text.match(/#[\p{L}\p{N}_]+/gu) || [];
  return Array.from(new Set(matches));
}

function metaFromJson(j: Record<string, unknown>, fallbackUrl: string): VideoMeta {
  const title = (j.title as string) || '';
  const description = (j.description as string) || '';
  const hashtags = extractHashtags(`${title} ${description}`);
  const music = j.music as Record<string, unknown> | undefined;
  return {
    id: (j.id as string) || '',
    url: (j.webpage_url as string) || fallbackUrl,
    platform: detectPlatform((j.webpage_url as string) || fallbackUrl),
    title,
    description,
    uploader: (j.uploader as string) || (j.uploader_id as string) || '',
    uploadDate: (j.upload_date as string) || '',
    duration: (j.duration as number) || 0,
    viewCount: (j.view_count as number) || 0,
    likeCount: (j.like_count as number) || 0,
    thumbnail: (j.thumbnail as string) || '',
    hashtags,
    audioName: (j.track as string) || (music?.title as string),
    raw: j,
  };
}

/** Run yt-dlp and capture stdout. Auto-resolves the binary on first use. */
function runYtDlp(args: string[], opts?: { timeoutMs?: number }): Promise<string> {
  return new Promise((resolve, reject) => {
    resolveYtDlp().then((bin) => {
      // Tell yt-dlp where to find ffmpeg + ffprobe so it can merge separate
      // audio/video streams. YouTube serves video and audio in different
      // formats and yt-dlp must mux them with ffmpeg; without --ffmpeg-location
      // pointing at our bundled binaries the download fails.
      const ffmpegDir = getFfmpegDirSync();
      const finalArgs = ffmpegDir
        ? ['--ffmpeg-location', ffmpegDir, ...args]
        : args;

      const proc = spawn(bin, finalArgs);
      let stdout = '';
      let stderr = '';
      proc.stdout.on('data', (c) => { stdout += c.toString(); });
      proc.stderr.on('data', (c) => { stderr += c.toString(); });
      proc.on('error', (err) => {
        const code = (err as NodeJS.ErrnoException).code;
        if (code === 'ENOENT') {
          reject(new Error(`yt-dlp binary not runnable at "${bin}". Set YT_DLP env var or delete ./storage/bin/yt-dlp* to re-download.`));
        } else reject(err);
      });
      let timer: ReturnType<typeof setTimeout> | undefined;
      if (opts?.timeoutMs) {
        timer = setTimeout(() => {
          try { proc.kill('SIGKILL'); } catch { /* ignore */ }
          reject(new Error(`yt-dlp timed out after ${opts.timeoutMs}ms`));
        }, opts.timeoutMs);
      }
      proc.on('close', (code) => {
        if (timer) clearTimeout(timer);
        if (code !== 0) return reject(new Error(`yt-dlp failed (${code}): ${stderr.slice(-500)}`));
        resolve(stdout);
      });
    }).catch((err) => {
      reject(err instanceof Error ? err : new Error(String(err)));
    });
  });
}

/**
 * Fetch metadata only (no download). Fast.
 */
export async function fetchVideoMeta(url: string): Promise<VideoMeta> {
  const stdout = await runYtDlp(
    ['--dump-json', '--no-warnings', '--no-playlist', url],
    { timeoutMs: 30_000 }
  );
  try {
    const j = JSON.parse(stdout);
    return metaFromJson(j, url);
  } catch (e) {
    throw new Error(`Failed to parse yt-dlp output: ${e}`);
  }
}

/**
 * Download just a thumbnail. Reuses an existing meta when provided so we
 * don't pay for a second yt-dlp invocation.
 */
export async function downloadThumbnail(
  url: string,
  existingMeta?: VideoMeta
): Promise<{ publicPath: string; filePath: string }> {
  ensureDirs();
  const meta = existingMeta || await fetchVideoMeta(url);
  if (!meta.thumbnail) throw new Error('No thumbnail available');

  const res = await fetch(meta.thumbnail);
  if (!res.ok) throw new Error(`Thumbnail fetch failed: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());

  const ext = meta.thumbnail.match(/\.(jpe?g|png|webp)(?:\?|$)/i)?.[1]?.toLowerCase() || 'jpg';
  const fileName = `${Date.now()}_${crypto.randomBytes(3).toString('hex')}.${ext}`;
  const filePath = path.join(THUMBS_DIR, fileName);
  fs.writeFileSync(filePath, buf);
  return { publicPath: `/storage/thumbnails/${fileName}`, filePath };
}

/**
 * Download just the video file.
 */
export async function downloadVideo(url: string): Promise<{ publicPath: string; filePath: string; bytes: number }> {
  ensureDirs();
  const fileName = `${Date.now()}_${crypto.randomBytes(3).toString('hex')}.mp4`;
  const outPath = path.join(VIDEOS_DIR, fileName);

  await runYtDlp([
    // Prefer a single MP4 file; fall back to the best available format
    '-f', 'mp4/best[ext=mp4]/best',
    '--merge-output-format', 'mp4',
    '-o', outPath,
    '--no-warnings',
    '--no-playlist',
    '--no-progress',
    url,
  ], { timeoutMs: 5 * 60_000 });

  if (!fs.existsSync(outPath)) {
    throw new Error('yt-dlp finished but no output file found');
  }
  const bytes = fs.statSync(outPath).size;
  return { publicPath: `/storage/videos/${fileName}`, filePath: outPath, bytes };
}

/**
 * One-shot: download both the video file and the thumbnail in a single yt-dlp
 * pass and return the parsed metadata too. Cheaper than calling fetchMeta +
 * downloadVideo + downloadThumbnail separately.
 */
export async function downloadTrend(url: string): Promise<DownloadResult> {
  ensureDirs();

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'trend-'));
  try {
    const id = `${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const stem = path.join(tmpDir, id);

    // Single yt-dlp call: write JSON metadata, video, and thumbnail.
    // --write-info-json gives us the same data as --dump-json.
    // --write-thumbnail downloads the thumbnail next to the video.
    await runYtDlp([
      '-f', 'mp4/best[ext=mp4]/best',
      '--merge-output-format', 'mp4',
      '-o', `${stem}.%(ext)s`,
      '--write-info-json',
      '--write-thumbnail',
      '--convert-thumbnails', 'jpg',
      '--no-warnings',
      '--no-playlist',
      '--no-progress',
      url,
    ], { timeoutMs: 5 * 60_000 });

    // Find the produced files
    const produced = fs.readdirSync(tmpDir).filter((f) => f.startsWith(id));
    const videoFile = produced.find((f) => /\.(mp4|webm|mkv|mov)$/i.test(f));
    const thumbFile = produced.find((f) => /\.(jpe?g|png|webp)$/i.test(f));
    const infoFile = produced.find((f) => f.endsWith('.info.json'));

    if (!videoFile) throw new Error('yt-dlp finished but no video file produced');

    const meta = infoFile
      ? metaFromJson(JSON.parse(fs.readFileSync(path.join(tmpDir, infoFile), 'utf8')), url)
      : await fetchVideoMeta(url);

    // Move video into /storage/videos
    const videoFinalName = `${id}.mp4`;
    const videoFinalPath = path.join(VIDEOS_DIR, videoFinalName);
    // If yt-dlp produced a non-mp4 (webm), keep its extension for the public path
    const videoExt = path.extname(videoFile).toLowerCase().replace('.', '') || 'mp4';
    const videoTarget = videoExt === 'mp4'
      ? videoFinalPath
      : path.join(VIDEOS_DIR, `${id}.${videoExt}`);
    fs.copyFileSync(path.join(tmpDir, videoFile), videoTarget);
    const videoPublicPath = `/storage/videos/${path.basename(videoTarget)}`;
    const bytes = fs.statSync(videoTarget).size;

    let thumbnailPublicPath: string | undefined;
    let thumbnailFilePath: string | undefined;
    if (thumbFile) {
      const ext = path.extname(thumbFile).toLowerCase().replace('.', '') || 'jpg';
      const thumbFinalName = `${id}.${ext}`;
      const thumbFinalPath = path.join(THUMBS_DIR, thumbFinalName);
      fs.copyFileSync(path.join(tmpDir, thumbFile), thumbFinalPath);
      thumbnailPublicPath = `/storage/thumbnails/${thumbFinalName}`;
      thumbnailFilePath = thumbFinalPath;
    } else if (meta.thumbnail) {
      // Fallback: download thumbnail directly
      try {
        const t = await downloadThumbnail(url, meta);
        thumbnailPublicPath = t.publicPath;
        thumbnailFilePath = t.filePath;
      } catch { /* non-fatal */ }
    }

    return {
      meta,
      videoPublicPath,
      videoFilePath: videoTarget,
      thumbnailPublicPath,
      thumbnailFilePath,
      bytes,
    };
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
  }
}
