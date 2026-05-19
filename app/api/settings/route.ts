import { NextRequest, NextResponse } from 'next/server';
import { connectDB, settings } from '@/lib/db/client';

export async function POST(req: NextRequest) {
  const { updates } = await req.json();
  await connectDB();
  for (const u of updates) {
    await settings.findOneAndUpdate(
      { key: u.key },
      { $set: { value: u.value, updatedAt: new Date() } },
      { upsert: true }
    );
  }
  return NextResponse.json({ ok: true });
}
