import { NextRequest, NextResponse } from 'next/server';
import { connectDB, characters } from '@/lib/db/client';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  await connectDB();

  await characters.findByIdAndUpdate(id, {
    $set: {
      name: body.name,
      personaBible: body.personaBible,
      visualTraits: body.visualTraits,
      voiceProfile: body.voiceProfile,
      masterImageId: body.masterImageId,
    },
  });

  return NextResponse.json({ ok: true });
}
