import { NextResponse } from 'next/server';
import { connectDB, characters, images, audioClips, trends, videoProjects,
  productionTasks, extractedFrames, prompts, settings } from '@/lib/db/client';

export async function GET() {
  await connectDB();
  const data = {
    exportedAt: new Date().toISOString(),
    characters: (await characters.find()).map(r => r.toJSON()),
    images: (await images.find()).map(r => r.toJSON()),
    audioClips: (await audioClips.find()).map(r => r.toJSON()),
    trends: (await trends.find()).map(r => r.toJSON()),
    videoProjects: (await videoProjects.find()).map(r => r.toJSON()),
    productionTasks: (await productionTasks.find()).map(r => r.toJSON()),
    extractedFrames: (await extractedFrames.find()).map(r => r.toJSON()),
    prompts: (await prompts.find()).map(r => r.toJSON()),
    settings: (await settings.find()).map(r => r.toJSON()),
  };
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename=studio-backup-${Date.now()}.json`,
    },
  });
}
