import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

const STORAGE_DIR = path.join(process.cwd(), 'storage');

// Lite mime detection without extra dep
function getMime(ext: string): string {
  const map: Record<string, string> = {
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
    '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg',
    '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime',
    '.json': 'application/json', '.txt': 'text/plain',
  };
  return map[ext.toLowerCase()] || 'application/octet-stream';
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: parts } = await params;
  const safe = parts.filter((p) => !p.includes('..'));
  const filePath = path.join(STORAGE_DIR, ...safe);

  if (!filePath.startsWith(STORAGE_DIR)) {
    return new NextResponse('Forbidden', { status: 403 });
  }
  if (!fs.existsSync(filePath)) {
    return new NextResponse('Not found', { status: 404 });
  }
  const stat = fs.statSync(filePath);
  if (stat.isDirectory()) {
    return new NextResponse('Not found', { status: 404 });
  }

  const buf = fs.readFileSync(filePath);
  const ext = path.extname(filePath);

  return new NextResponse(buf, {
    headers: {
      'Content-Type': getMime(ext),
      'Content-Length': String(buf.length),
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
