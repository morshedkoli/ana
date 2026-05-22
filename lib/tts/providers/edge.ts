/**
 * Microsoft Edge TTS — unlimited free, no key required.
 *
 * Implementation calls the Python sidecar `scripts/tts.py` (edge-tts package),
 * because Microsoft's stream protocol needs a long-lived WebSocket; a Python
 * subprocess keeps things simple and reliable.
 *
 * Curated multi-language voices below cover Bangla (Microsoft's flagship
 * Bangla voices are only available here for free), English, Hindi, Arabic,
 * etc. The complete list (~400 voices) is available at runtime via
 * `edge-tts --list-voices`; we expose a curated subset for the UI dropdown.
 */
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import type {
  TtsProviderModule, SynthesizeInput, SynthesizeResult, TtsVoice,
} from '../types';

const TMP = path.join(process.cwd(), 'storage', 'tmp');

function ensureTmp() {
  if (!fs.existsSync(TMP)) fs.mkdirSync(TMP, { recursive: true });
}

function formatRate(rate: number): string {
  const pct = Math.round((rate - 1) * 100);
  return pct >= 0 ? `+${pct}%` : `${pct}%`;
}
function formatPitch(pitch: number): string {
  return pitch >= 0 ? `+${pitch}Hz` : `${pitch}Hz`;
}

const PYTHON = process.env.PYTHON || (os.platform() === 'win32' ? 'python' : 'python3');

export const edge: TtsProviderModule = {
  meta: {
    id: 'edge',
    name: 'Microsoft Edge TTS',
    description: 'Unlimited free, neural voices in 75+ languages. Best Bangla quality.',
    homepageUrl: 'https://github.com/rany2/edge-tts',
    keysHelp: 'No key needed. Run `pip install edge-tts` once on the server.',
    requiresKey: false,
    supportsBangla: true,
    freeTier: 'Unlimited',
    maxChars: 8000,
    defaultVoices: [
      // Bangla
      { id: 'bn-BD-NabanitaNeural', label: 'Nabanita (BD, Female)', language: 'bn-BD', gender: 'female', region: 'BD', provider: 'edge' },
      { id: 'bn-BD-PradeepNeural', label: 'Pradeep (BD, Male)', language: 'bn-BD', gender: 'male', region: 'BD', provider: 'edge' },
      { id: 'bn-IN-TanishaaNeural', label: 'Tanishaa (IN, Female)', language: 'bn-IN', gender: 'female', region: 'IN', provider: 'edge' },
      { id: 'bn-IN-BashkarNeural', label: 'Bashkar (IN, Male)', language: 'bn-IN', gender: 'male', region: 'IN', provider: 'edge' },
      // English
      { id: 'en-US-AriaNeural', label: 'Aria (US, Female)', language: 'en-US', gender: 'female', provider: 'edge' },
      { id: 'en-US-GuyNeural', label: 'Guy (US, Male)', language: 'en-US', gender: 'male', provider: 'edge' },
      { id: 'en-US-JennyNeural', label: 'Jenny (US, Female)', language: 'en-US', gender: 'female', provider: 'edge' },
      { id: 'en-GB-SoniaNeural', label: 'Sonia (UK, Female)', language: 'en-GB', gender: 'female', provider: 'edge' },
      { id: 'en-GB-RyanNeural', label: 'Ryan (UK, Male)', language: 'en-GB', gender: 'male', provider: 'edge' },
      // Hindi (often nice for South Asian content)
      { id: 'hi-IN-MadhurNeural', label: 'Madhur (Hindi, Male)', language: 'hi-IN', gender: 'male', provider: 'edge' },
      { id: 'hi-IN-SwaraNeural', label: 'Swara (Hindi, Female)', language: 'hi-IN', gender: 'female', provider: 'edge' },
    ],
  },

  async listVoices() {
    return edge.meta.defaultVoices ?? [];
  },

  async synthesize(input: SynthesizeInput): Promise<SynthesizeResult> {
    ensureTmp();
    const voice = input.voice || 'bn-BD-NabanitaNeural';
    const rate = formatRate(input.rate ?? 1.0);
    const pitch = formatPitch(input.pitch ?? 0);

    const tmpFile = path.join(TMP, `edge_${Date.now()}_${crypto.randomBytes(3).toString('hex')}.mp3`);
    const scriptPath = path.join(process.cwd(), 'scripts', 'tts.py');

    return new Promise((resolve, reject) => {
      let proc;
      try {
        proc = spawn(PYTHON, [
          scriptPath,
          '--text', input.text,
          '--voice', voice,
          '--rate', rate,
          '--pitch', pitch,
          '--output', tmpFile,
        ]);
      } catch (err) {
        return reject(new Error(
          `Couldn't start python. Edge TTS needs Python 3 + edge-tts on the server ` +
          `(pip install edge-tts). Use a different engine (StreamElements, Google ` +
          `Translate, Pollinations, ElevenLabs, Hugging Face) if you can't install it. ` +
          `Original error: ${err instanceof Error ? err.message : String(err)}`
        ));
      }
      let stderr = '';
      proc.stderr.on('data', (c) => { stderr += c.toString(); });
      proc.on('error', (err) => {
        const code = (err as NodeJS.ErrnoException).code;
        if (code === 'ENOENT') {
          reject(new Error(
            `Python not found on PATH. Edge TTS requires Python 3 + edge-tts ` +
            `(pip install edge-tts). Try a different engine — StreamElements, ` +
            `Google Translate, Pollinations, ElevenLabs, and Hugging Face all work ` +
            `without Python.`
          ));
        } else reject(err);
      });
      proc.on('close', (code) => {
        if (code !== 0) {
          return reject(new Error(
            `edge-tts failed (code ${code}). Is python + edge-tts installed? ` +
            `Run: pip install edge-tts. ${stderr.slice(-300)}`
          ));
        }
        if (!fs.existsSync(tmpFile)) return reject(new Error('edge-tts produced no output'));
        const buf = fs.readFileSync(tmpFile);
        try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }
        resolve({ buffer: buf, contentType: 'audio/mpeg', extension: 'mp3' });
      });
    });
  },
};
