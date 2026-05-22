/**
 * ffmpeg / ffprobe binary resolver.
 *
 * Resolution order (first match wins):
 *  1. process.env.FFMPEG / FFPROBE          → explicit absolute path
 *  2. ffmpeg-static / ffprobe-static        → bundled with node_modules
 *  3. ffmpeg / ffprobe on system PATH       → user installed via apt/brew/winget
 *
 * `ffmpeg-static` and `ffprobe-static` ship statically-linked binaries for
 * Linux/macOS/Windows on x64 + arm64, so the bundled path covers every VPS
 * we'd reasonably deploy to without needing apt/brew.
 *
 * Used by:
 *  - lib/video/ffmpeg.ts  → frame extraction & video probing
 *  - lib/video/yt-dlp.ts  → passed via --ffmpeg-location so yt-dlp can merge
 *                            separate audio/video streams (e.g. YouTube)
 */
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

let cachedFfmpeg: string | null = null;
let cachedFfprobe: string | null = null;
let cachedFfmpegDir: string | null = null;

const SHARED_DIR = path.join(process.cwd(), 'storage', 'bin');

function probe(cmd: string): Promise<boolean> {
  return new Promise((resolve) => {
    let proc: ReturnType<typeof spawn>;
    try { proc = spawn(cmd, ['-version']); } catch { return resolve(false); }
    let done = false;
    const finish = (ok: boolean) => { if (!done) { done = true; resolve(ok); } };
    proc.on('error', () => finish(false));
    proc.on('close', (code) => finish(code === 0));
    setTimeout(() => { try { proc.kill(); } catch { /* ignore */ } finish(false); }, 5000);
  });
}

/** Lazy-require so import errors don't crash the route at module load. */
function bundledFfmpeg(): string | null {
  try {
    // ffmpeg-static exports the absolute binary path as default. On rare
    // unsupported platforms it can be null.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('ffmpeg-static') as string | null;
    if (mod && fs.existsSync(mod)) return mod;
  } catch { /* not installed */ }
  return null;
}

function bundledFfprobe(): string | null {
  try {
    // ffprobe-static exports an object: { path: string }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('ffprobe-static') as { path?: string } | null;
    if (mod?.path && fs.existsSync(mod.path)) return mod.path;
  } catch { /* not installed */ }
  return null;
}

export async function resolveFfmpeg(): Promise<string> {
  if (cachedFfmpeg) return cachedFfmpeg;

  if (process.env.FFMPEG && (await probe(process.env.FFMPEG))) {
    cachedFfmpeg = process.env.FFMPEG;
    return cachedFfmpeg;
  }
  const bundled = bundledFfmpeg();
  if (bundled && (await probe(bundled))) {
    cachedFfmpeg = bundled;
    return cachedFfmpeg;
  }
  if (await probe('ffmpeg')) {
    cachedFfmpeg = 'ffmpeg';
    return cachedFfmpeg;
  }
  throw new Error(
    'ffmpeg not found. ffmpeg-static should provide it automatically — ' +
    'reinstall dependencies (`npm install`) or set the FFMPEG env var to a binary path.'
  );
}

export async function resolveFfprobe(): Promise<string> {
  if (cachedFfprobe) return cachedFfprobe;

  if (process.env.FFPROBE && (await probe(process.env.FFPROBE))) {
    cachedFfprobe = process.env.FFPROBE;
    return cachedFfprobe;
  }
  const bundled = bundledFfprobe();
  if (bundled && (await probe(bundled))) {
    cachedFfprobe = bundled;
    return cachedFfprobe;
  }
  if (await probe('ffprobe')) {
    cachedFfprobe = 'ffprobe';
    return cachedFfprobe;
  }
  throw new Error(
    'ffprobe not found. ffprobe-static should provide it automatically — ' +
    'reinstall dependencies or set the FFPROBE env var.'
  );
}

/** Sync best-effort path lookup, used when we just need to pass it as an argument
 *  (e.g. yt-dlp's --ffmpeg-location flag). Returns null if nothing's resolvable. */
export function resolveFfmpegSync(): string | null {
  if (cachedFfmpeg) return cachedFfmpeg;
  if (process.env.FFMPEG && fs.existsSync(process.env.FFMPEG)) return process.env.FFMPEG;
  return bundledFfmpeg();
}

/**
 * Returns a directory containing BOTH ffmpeg and ffprobe binaries (yt-dlp
 * needs both in the same place). ffmpeg-static and ffprobe-static install
 * their binaries into separate node_modules subtrees, so on first call we
 * copy ffprobe alongside ffmpeg into a shared dir under storage/bin/.
 *
 * Returns null if either binary is missing.
 */
export function getFfmpegDirSync(): string | null {
  if (cachedFfmpegDir) return cachedFfmpegDir;

  const ffmpeg = resolveFfmpegSync();
  if (!ffmpeg) return null;

  const ffprobe = bundledFfprobe()
    || (process.env.FFPROBE && fs.existsSync(process.env.FFPROBE) ? process.env.FFPROBE : null);
  if (!ffprobe) {
    // ffmpeg alone isn't enough for yt-dlp to merge streams — bail and let it
    // fall back to ffmpeg on PATH (which may have ffprobe alongside).
    return path.dirname(ffmpeg);
  }

  const ffmpegDir = path.dirname(ffmpeg);
  const ffprobeDir = path.dirname(ffprobe);
  if (ffmpegDir === ffprobeDir) {
    cachedFfmpegDir = ffmpegDir;
    return ffmpegDir;
  }

  // Copy ffprobe next to ffmpeg in our own shared dir so yt-dlp finds both.
  // We use a separate dir (not ffmpeg-static's own) to avoid touching package files.
  try {
    if (!fs.existsSync(SHARED_DIR)) fs.mkdirSync(SHARED_DIR, { recursive: true });
    const ffmpegName = path.basename(ffmpeg);
    const ffprobeName = path.basename(ffprobe);
    const sharedFfmpeg = path.join(SHARED_DIR, ffmpegName);
    const sharedFfprobe = path.join(SHARED_DIR, ffprobeName);

    if (!fs.existsSync(sharedFfmpeg)) {
      fs.copyFileSync(ffmpeg, sharedFfmpeg);
      try { fs.chmodSync(sharedFfmpeg, 0o755); } catch { /* ignore */ }
    }
    if (!fs.existsSync(sharedFfprobe)) {
      fs.copyFileSync(ffprobe, sharedFfprobe);
      try { fs.chmodSync(sharedFfprobe, 0o755); } catch { /* ignore */ }
    }
    cachedFfmpegDir = SHARED_DIR;
    return SHARED_DIR;
  } catch (err) {
    console.warn('[ffmpeg] failed to consolidate binaries:', err);
    return ffmpegDir;
  }
}
