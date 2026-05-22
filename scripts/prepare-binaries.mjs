#!/usr/bin/env node
/**
 * Pre-warm runtime binaries the app needs.
 * Currently downloads the standalone yt-dlp binary into ./storage/bin/
 * so the first request after deploy doesn't pay the install cost.
 *
 * Idempotent: skips download if the binary already runs.
 *
 * Used by:
 *  - npm run prepare-binaries
 *  - .github/workflows/deploy.yml (post-build)
 *
 * Sourced from a separate file (not the existing TS module) so it can run
 * with plain `node` at deploy time without tsx/Next.
 */
import { spawn } from 'node:child_process';
import { mkdirSync, existsSync, statSync, writeFileSync, renameSync, chmodSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { platform, arch } from 'node:os';

const projectDir = process.cwd();
const binDir = join(projectDir, 'storage', 'bin');
const isWin = platform() === 'win32';
const localBin = join(binDir, isWin ? 'yt-dlp.exe' : 'yt-dlp');

function downloadUrl() {
  if (isWin) return 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe';
  if (platform() === 'darwin') return 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos';
  if (arch() === 'arm64' || arch() === 'arm') return 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux_aarch64';
  return 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux';
}

function probe(cmd) {
  return new Promise((resolve) => {
    let proc;
    try { proc = spawn(cmd, ['--version']); } catch { return resolve(false); }
    let done = false;
    const finish = (ok) => { if (!done) { done = true; resolve(ok); } };
    proc.on('error', () => finish(false));
    proc.on('close', (code) => finish(code === 0));
    setTimeout(() => { try { proc.kill(); } catch {} finish(false); }, 5000);
  });
}

async function main() {
  if (!existsSync(binDir)) mkdirSync(binDir, { recursive: true });

  if (existsSync(localBin) && (await probe(localBin))) {
    console.log(`[binaries] yt-dlp already present at ${localBin}`);
    return;
  }

  const url = downloadUrl();
  console.log(`[binaries] downloading yt-dlp from ${url}…`);
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`yt-dlp download failed: ${res.status} ${res.statusText}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.byteLength < 100_000) throw new Error(`Suspiciously small download (${buf.byteLength} bytes)`);

  const tmp = `${localBin}.partial`;
  writeFileSync(tmp, buf);
  if (!isWin) {
    try { chmodSync(tmp, 0o755); } catch {}
  }
  if (existsSync(localBin)) { try { unlinkSync(localBin); } catch {} }
  renameSync(tmp, localBin);

  if (!(await probe(localBin))) {
    throw new Error(`Downloaded but ${localBin} won't execute. AV / SELinux / noexec mount?`);
  }
  const size = (statSync(localBin).size / 1024 / 1024).toFixed(1);
  console.log(`[binaries] yt-dlp ready (${size} MB) at ${localBin}`);
}

main().catch((err) => {
  console.error(`[binaries] FAILED: ${err.message}`);
  // Non-fatal: the app's runtime resolver will retry on first request
  process.exit(0);
});
