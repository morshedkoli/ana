import { NextRequest, NextResponse } from 'next/server';
import { connectDB, productionTasks } from '@/lib/db/client';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  await connectDB();
  await productionTasks.findByIdAndUpdate(id, {
    $set: {
      isDone: body.isDone,
      doneAt: body.isDone ? new Date().toISOString() : null,
    },
  });
  return NextResponse.json({ ok: true });
}
