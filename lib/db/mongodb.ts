import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI as string;

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI environment variable is not set');
}

// Singleton — prevents multiple connections in Next.js dev hot-reload
const g = global as typeof globalThis & { _mongoose?: typeof mongoose };

export async function connectDB(): Promise<typeof mongoose> {
  if (g._mongoose && mongoose.connection.readyState === 1) return g._mongoose;
  g._mongoose = await mongoose.connect(MONGODB_URI);
  return g._mongoose;
}
