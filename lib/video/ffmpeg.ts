/**
 * FFmpeg wrapper for video processing.
 * Requires: apt install ffmpeg
 */

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const FRAMES_DIR = path.join(process.cwd(), 'storage', 'frames');

function ensureDir() {
  if (!fs.existsSync(FRAMES_DIR)) fs.mkdirSync(FRAMES_DIR, { recursive: true });
}

export interface FrameExtractOptions {
  videoPath: string;
  // Extract every N seconds (default 1)
  everySec?: number;
  // OR specific timestamps in seconds
  timestamps?: number[];
  // Max frames to extract
  maxFrames?: number;
}

export interface ExtractedFrameResult {
  framePath: string;
  publicPath: string;
  fileName: string;
  timestampSec: number;
}

export async function extractFrames(opts: FrameExtractOptions): Promise<ExtractedFrameResult[]> {
  ensureDir();
  const batchId = `${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const batchDir = path.join(FRAMES_DIR, batchId);
  fs.mkdirSync(batchDir, { recursive: true });

  // Strategy 1: specific timestamps
  if (opts.timestamps && opts.timestamps.length > 0) {
    const results: ExtractedFrameResult[] = [];
    for (let i = 0; i < opts.timestamps.length; i++) {
      const ts = opts.timestamps[i];
      const fileName = `frame_${String(i).padStart(4, '0')}_t${ts.toFixed(2)}.jpg`;
      const outPath = path.join(batchDir, fileName);
      await runFfmpeg([
        '-y',
        '-ss', String(ts),
        '-i', opts.videoPath,
        '-frames:v', '1',
        '-q:v', '2',
        outPath,
      ]);
      results.push({
        framePath: outPath,
        publicPath: `/storage/frames/${batchId}/${fileName}`,
        fileName,
        timestampSec: ts,
      });
    }
    return results;
  }

  // Strategy 2: every N seconds
  const everySec = opts.everySec ?? 1;
  const outputPattern = path.join(batchDir, 'frame_%04d.jpg');

  await runFfmpeg([
    '-y',
    '-i', opts.videoPath,
    '-vf', `fps=1/${everySec}`,
    '-q:v', '2',
    outputPattern,
  ]);

  const files = fs.readdirSync(batchDir).filter((f) => f.endsWith('.jpg')).sort();
  const limited = opts.maxFrames ? files.slice(0, opts.maxFrames) : files;

  return limited.map((fileName, idx) => ({
    framePath: path.join(batchDir, fileName),
    publicPath: `/storage/frames/${batchId}/${fileName}`,
    fileName,
    timestampSec: idx * everySec,
  }));
}

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', args);
    let stderr = '';
    proc.stderr.on('data', (c) => { stderr += c.toString(); });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code !== 0) return reject(new Error(`ffmpeg exited ${code}: ${stderr.slice(-500)}`));
      resolve();
    });
  });
}

export async function getVideoDuration(videoPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      videoPath,
    ]);
    let stdout = '';
    proc.stdout.on('data', (c) => { stdout += c.toString(); });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code !== 0) return reject(new Error('ffprobe failed'));
      resolve(parseFloat(stdout.trim()));
    });
  });
}
