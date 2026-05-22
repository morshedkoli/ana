/**
 * yt-dlp binary resolver with auto-download.
 *
 * Resolution order (first match wins):
 *  1. process.env.YT_DLP                 → explicit absolute path / command
 *  2. <project>/storage/bin/yt-dlp[.exe] → previously auto-downloaded copy
 *  3. yt-dlp on system PATH              → user installed via pip/apt/winget
 *  4. download standalone binary from GitHub releases on the fly
 *
 * yt-dlp ships pre-built single-file executables that need NO Python,
 * so option 4 lets users skip every install step.
 *
 * Releases: https://github.com/yt-dlp/yt-dlp/releases/latest
 */
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';

const BIN_DIR = path.join(process.cwd(), 'storage', 'bin');
const PLATFORM = os.platform();
const ARCH = os.arch();

function localBinaryName(): string {
  return PLATFORM === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
}

const LOCAL_BIN = path.join(BIN_DIR, localBinaryName());

/** GitHub release asset for the current OS / arch. */
function downloadUrl(): string {
  // yt-dlp publishes platform-specific zero-dep binaries
  if (PLATFORM === 'win32') {
    return 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe';
  }
  if (PLATFORM === 'darwin') {
    return 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos';
  }
  // linux & other unix-like: the universal zip-app build
  if (ARCH === 'arm64' || ARCH === 'arm') {
    return 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux_aarch64';
  }
  return 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux';
}

/** Cached resolved path so we don't probe the FS on every call. */
let cached: string | null = null;
let inFlight: Promise<string> | null = null;

/** Returns true if the given command exits with code 0 for `--version`. */
function probe(cmd: string): Promise<boolean> {
  return new Promise((resolve) => {
    let proc: ReturnType<typeof spawn>;
    try {
      proc = spawn(cmd, ['--version']);
    } catch {
      resolve(false); return;
    }
    let done = false;
    const finish = (ok: boolean) => { if (!done) { done = true; resolve(ok); } };
    proc.on('error', () => finish(false));
    proc.on('close', (code) => finish(code === 0));
    // Hard timeout: 5s
    setTimeout(() => { try { proc.kill(); } catch { /* ignore */ } finish(false); }, 5000);
  });
}

/** Look up an executable on PATH. Returns the resolved name or null. */
async function whichOnPath(name: string): Promise<string | null> {
  return (await probe(name)) ? name : null;
}

/** Download the standalone yt-dlp binary into ./storage/bin and return its path. */
async function downloadBinary(): Promise<string> {
  if (!fs.existsSync(BIN_DIR)) fs.mkdirSync(BIN_DIR, { recursive: true });
  const url = downloadUrl();
  console.log(`[yt-dlp] downloading from ${url}…`);

  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) {
    throw new Error(`Failed to download yt-dlp (${res.status} ${res.statusText}). ` +
      `Check your network or set YT_DLP env var to a manually installed path.`);
  }
  const ab = await res.arrayBuffer();
  if (ab.byteLength < 100_000) {
    throw new Error(`Downloaded yt-dlp is suspiciously small (${ab.byteLength} bytes). Aborting.`);
  }

  // Write atomically to avoid leaving a half-written binary if we crash mid-download
  const tmp = `${LOCAL_BIN}.partial`;
  fs.writeFileSync(tmp, Buffer.from(ab));
  if (PLATFORM !== 'win32') {
    try { fs.chmodSync(tmp, 0o755); } catch { /* ignore */ }
  }
  fs.renameSync(tmp, LOCAL_BIN);

  // Verify it actually runs
  const ok = await probe(LOCAL_BIN);
  if (!ok) {
    throw new Error(`Downloaded yt-dlp at ${LOCAL_BIN} but it failed to execute. ` +
      `Your OS or antivirus may be blocking it.`);
  }
  console.log(`[yt-dlp] installed at ${LOCAL_BIN}`);
  return LOCAL_BIN;
}

/**
 * Resolve a usable yt-dlp command. Auto-downloads if needed.
 * Subsequent calls are O(1).
 */
export async function resolveYtDlp(): Promise<string> {
  if (cached) return cached;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    // 1. Explicit env override
    if (process.env.YT_DLP && process.env.YT_DLP.trim()) {
      const candidate = process.env.YT_DLP.trim();
      if (await probe(candidate)) {
        cached = candidate;
        return candidate;
      }
      console.warn(`[yt-dlp] YT_DLP env var ${candidate} doesn't run, falling through.`);
    }

    // 2. Previously auto-downloaded
    if (fs.existsSync(LOCAL_BIN) && await probe(LOCAL_BIN)) {
      cached = LOCAL_BIN;
      return LOCAL_BIN;
    }

    // 3. PATH
    const onPath = await whichOnPath('yt-dlp');
    if (onPath) {
      cached = onPath;
      return onPath;
    }

    // 4. Auto-download
    cached = await downloadBinary();
    return cached;
  })();

  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}

/** Force-redownload the binary, replacing any existing copy. */
export async function reinstallYtDlp(): Promise<string> {
  cached = null;
  if (fs.existsSync(LOCAL_BIN)) {
    try { fs.unlinkSync(LOCAL_BIN); } catch { /* ignore */ }
  }
  return downloadBinary();
}

export interface YtDlpStatus {
  ready: boolean;
  path: string | null;
  source: 'env' | 'local' | 'path' | 'missing';
  version?: string;
  bytes?: number;
}

/** Lightweight status check used by the UI banner. Does NOT auto-download. */
export async function getYtDlpStatus(): Promise<YtDlpStatus> {
  // env override
  if (process.env.YT_DLP && process.env.YT_DLP.trim()) {
    const cmd = process.env.YT_DLP.trim();
    if (await probe(cmd)) {
      return { ready: true, path: cmd, source: 'env', version: await readVersion(cmd) };
    }
  }
  // cached local binary
  if (fs.existsSync(LOCAL_BIN) && await probe(LOCAL_BIN)) {
    const stat = fs.statSync(LOCAL_BIN);
    return {
      ready: true, path: LOCAL_BIN, source: 'local',
      bytes: stat.size, version: await readVersion(LOCAL_BIN),
    };
  }
  // system path
  const onPath = await whichOnPath('yt-dlp');
  if (onPath) {
    return { ready: true, path: 'yt-dlp', source: 'path', version: await readVersion('yt-dlp') };
  }
  return { ready: false, path: null, source: 'missing' };
}

function readVersion(cmd: string): Promise<string | undefined> {
  return new Promise((resolve) => {
    const proc = spawn(cmd, ['--version']);
    let out = '';
    proc.stdout.on('data', (c) => { out += c.toString(); });
    proc.on('error', () => resolve(undefined));
    proc.on('close', () => resolve(out.trim() || undefined));
    setTimeout(() => { try { proc.kill(); } catch { /* ignore */ } resolve(undefined); }, 4000);
  });
}
