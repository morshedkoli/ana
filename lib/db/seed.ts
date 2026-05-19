import { connectDB } from './mongodb';
import { characters, settings } from './schema';

async function seed() {
  console.log('Seeding database…');
  await connectDB();

  const existing = await characters.findOne();
  if (!existing) {
    await characters.create({
      name: 'Untitled Influencer',
      personaBible: {
        age: 22,
        location: 'Dhaka, Bangladesh',
        occupation: 'University student',
        backstory: '',
        personality: '',
        speakingStyle: 'casual, friendly Bangla',
        signaturePhrases: [],
        topics: ['daily life', 'university', 'food', 'fashion'],
      },
      visualTraits: {
        face: '',
        hair: 'long black hair',
        eyes: 'brown',
        skinTone: 'warm beige',
        body: 'slim',
        signatureTraits: [],
      },
      voiceProfile: {
        engine: 'edge-tts',
        voiceId: 'bn-BD-NabanitaNeural',
        rate: 1.0,
        pitch: 0,
      },
    });
    console.log('✓ Created placeholder character');
  }

  const defaults = [
    { key: 'cloudflare_account_id', value: '' },
    { key: 'cloudflare_api_token', value: '' },
    { key: 'posting_timezone', value: 'Asia/Dhaka' },
    { key: 'optimal_post_times', value: ['19:00', '21:00'] },
    { key: 'default_hashtags', value: ['#fyp', '#bangladesh', '#dhaka', '#viral'] },
  ];

  for (const s of defaults) {
    await settings.updateOne(
      { key: s.key },
      { $setOnInsert: { key: s.key, value: s.value } },
      { upsert: true }
    );
  }
  console.log('✓ Default settings seeded');
  console.log('Seed complete.');
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
