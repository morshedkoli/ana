import { connectDB } from './mongodb';
import { characters, images, audioClips, trends, videoProjects,
         productionTasks, extractedFrames, prompts, settings, postQueue } from './schema';

async function ensureIndexes() {
  console.log('Connecting to MongoDB and ensuring indexes…');
  await connectDB();

  await Promise.all([
    characters.createIndexes(),
    images.createIndexes(),
    audioClips.createIndexes(),
    trends.createIndexes(),
    videoProjects.createIndexes(),
    productionTasks.createIndexes(),
    extractedFrames.createIndexes(),
    prompts.createIndexes(),
    settings.createIndexes(),
    postQueue.createIndexes(),
  ]);

  console.log('✓ Indexes ready');
  process.exit(0);
}

ensureIndexes().catch((err) => {
  console.error(err);
  process.exit(1);
});
