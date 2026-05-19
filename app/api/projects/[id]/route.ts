import { NextRequest, NextResponse } from 'next/server';
import { connectDB, videoProjects, productionTasks } from '@/lib/db/client';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await connectDB();
  const project = await videoProjects.findById(id);
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const tasks = await productionTasks.find({ videoProjectId: id }).sort({ taskOrder: 1 });
  return NextResponse.json({ project: project.toJSON(), tasks: tasks.map(t => t.toJSON()) });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  await connectDB();
  await videoProjects.findByIdAndUpdate(id, { $set: body });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await connectDB();
  await videoProjects.findByIdAndDelete(id);
  await productionTasks.deleteMany({ videoProjectId: id });
  return NextResponse.json({ ok: true });
}
