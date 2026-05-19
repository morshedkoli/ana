import { NextRequest, NextResponse } from 'next/server';
import { connectDB, trends } from '@/lib/db/client';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  await connectDB();
  await trends.findByIdAndUpdate(id, { $set: body });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await connectDB();
  await trends.findByIdAndDelete(id);
  return NextResponse.json({ ok: true });
}
