/**
 * Microsoft Edge TTS — unlimited free Bangla voice generation.
 *
 * Bangla voices available:
 * - bn-BD-NabanitaNeural (female, Bangladesh)
 * - bn-BD-PradeepNeural  (male, Bangladesh)
 * - bn-IN-BashkarNeural  (male, India)
 * - bn-IN-TanishaaNeural (female, India)
 *
 * Requires: pip install edge-tts (Python sidecar)
 * The script is in scripts/tts.py
 */

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

export { BANGLA_VOICES } from './voices';

export interface TtsOptions {
  text: string;
  voice?: string;
  rate?: number; // 0.5 - 2.0
  pitch?: number; // -50 to +50 (Hz)
}

export interface TtsResult {
  filePath: string;
  fileName: string;
  publicPath: string;
  durationSec: number;
}

const AUDIO_DIR = path.join(process.cwd(), 'storage', 'audio');

function ensureDir() {
  if (!fs.existsSync(AUDIO_DIR)) fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

function formatRate(rate: number): string {
  // edge-tts wants percentage like "+10%" or "-20%"
  const pct = Math.round((rate - 1) * 100);
  return pct >= 0 ? `+${pct}%` : `${pct}%`;
}

function formatPitch(pitch: number): string {
  return pitch >= 0 ? `+${pitch}Hz` : `${pitch}Hz`;
}

export async function generateTts(opts: TtsOptions): Promise<TtsResult> {
  ensureDir();
  const voice = opts.voice || 'bn-BD-NabanitaNeural';
  const rate = formatRate(opts.rate ?? 1.0);
  const pitch = formatPitch(opts.pitch ?? 0);

  const fileName = `${Date.now()}_${crypto.randomBytes(3).toString('hex')}.mp3`;
  const outPath = path.join(AUDIO_DIR, fileName);

  const scriptPath = path.join(process.cwd(), 'scripts', 'tts.py');

  return new Promise((resolve, reject) => {
    const proc = spawn('python3', [
      scriptPath,
      '--text', opts.text,
      '--voice', voice,
      '--rate', rate,
      '--pitch', pitch,
      '--output', outPath,
    ]);

    let stderr = '';
    proc.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

    proc.on('error', (err) => reject(err));
    proc.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`edge-tts failed (code ${code}): ${stderr}`));
      }
      if (!fs.existsSync(outPath)) {
        return reject(new Error('edge-tts produced no output file'));
      }
      const bytes = fs.statSync(outPath).size;
      // Rough estimate: MP3 at 24kbps ≈ 3KB per sec. We use ffprobe later for exact.
      const durationSec = bytes / 3000;
      resolve({
        filePath: outPath,
        fileName,
        publicPath: `/storage/audio/${fileName}`,
        durationSec,
      });
    });
  });
}
