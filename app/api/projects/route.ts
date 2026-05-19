import { NextRequest, NextResponse } from 'next/server';
import { connectDB, videoProjects, productionTasks, characters } from '@/lib/db/client';

const DEFAULT_TASKS = [
  'Script written',
  'Bangla audio generated',
  'Character image selected',
  'Lip-sync video produced',
  'B-roll / dance produced',
  'Edited in CapCut',
  'Captions added (Bangla subtitles)',
  'Watermarks cropped',
  'AI disclosure label noted',
];

export async function GET() {
  await connectDB();
  const rows = await videoProjects.find().sort({ scheduledDate: -1 });
  return NextResponse.json(rows.map(r => r.toJSON()));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  await connectDB();
  const active = await characters.findOne({ isActive: true });

  const inserted = await videoProjects.create({
    characterId: active?.id ?? null,
    title: body.title,
    contentType: body.contentType || 'talking',
    scheduledDate: body.scheduledDate,
    status: body.status || 'idea',
    trendId: body.trendId ?? null,
  });

  // Auto-create the production checklist
  await Promise.all(
    DEFAULT_TASKS.map((taskName, i) =>
      productionTasks.create({
        videoProjectId: inserted.id,
        taskName,
        taskOrder: i,
      })
    )
  );

  return NextResponse.json(inserted.toJSON());
}
