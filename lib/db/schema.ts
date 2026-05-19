import mongoose, { Schema, model, models } from 'mongoose';

const transform = (_: unknown, ret: Record<string, unknown>) => {
  ret.id = String(ret._id);
  delete ret._id;
  delete ret.__v;
};

const opts = { toJSON: { transform }, toObject: { transform } };

/* ============================================================
   CHARACTERS
   ============================================================ */
const characterSchema = new Schema({
  name: { type: String, required: true },
  personaBible: { type: Schema.Types.Mixed, default: {} },
  visualTraits: { type: Schema.Types.Mixed, default: {} },
  voiceProfile: { type: Schema.Types.Mixed, default: {} },
  masterImageId: { type: String, default: null },
  isActive: { type: Boolean, default: true },
}, { timestamps: true, ...opts });

export const characters = (models.characters as mongoose.Model<CharacterDoc>) ||
  model<CharacterDoc>('characters', characterSchema);

/* ============================================================
   IMAGES
   ============================================================ */
const imageSchema = new Schema({
  characterId: { type: String, default: null },
  filePath: { type: String, required: true },
  thumbnailPath: { type: String, default: null },
  prompt: { type: String, default: null },
  negativePrompt: { type: String, default: null },
  seed: { type: Number, default: null },
  source: { type: String, default: 'upload' },
  model: { type: String, default: null },
  width: { type: Number, default: null },
  height: { type: Number, default: null },
  tags: { type: [String], default: [] },
  qualityScore: { type: Number, default: 0 },
  isMaster: { type: Boolean, default: false },
  isFavorite: { type: Boolean, default: false },
  notes: { type: String, default: null },
}, { timestamps: { createdAt: 'createdAt', updatedAt: false }, ...opts });

export const images = (models.images as mongoose.Model<ImageDoc>) ||
  model<ImageDoc>('images', imageSchema);

/* ============================================================
   AUDIO_CLIPS
   ============================================================ */
const audioClipSchema = new Schema({
  characterId: { type: String, default: null },
  filePath: { type: String, required: true },
  transcript: { type: String, required: true },
  language: { type: String, default: 'bn-BD' },
  voiceEngine: { type: String, required: true },
  voiceId: { type: String, default: null },
  rate: { type: Number, default: 1.0 },
  pitch: { type: Number, default: 0 },
  durationSec: { type: Number, default: null },
}, { timestamps: { createdAt: 'createdAt', updatedAt: false }, ...opts });

export const audioClips = (models.audioClips as mongoose.Model<AudioClipDoc>) ||
  model<AudioClipDoc>('audioClips', audioClipSchema);

/* ============================================================
   TRENDS
   ============================================================ */
const trendSchema = new Schema({
  sourceUrl: { type: String, required: true },
  platform: { type: String, default: null },
  title: { type: String, default: null },
  description: { type: String, default: null },
  thumbnailPath: { type: String, default: null },
  videoPath: { type: String, default: null },
  creator: { type: String, default: null },
  hashtags: { type: [String], default: [] },
  category: { type: String, default: null },
  status: { type: String, default: 'new' },
  lifecycleFlag: { type: String, default: 'fresh' },
  viewCount: { type: Number, default: null },
  audioName: { type: String, default: null },
  notes: { type: String, default: null },
  savedAt: { type: Date, default: Date.now },
  lastCheckedAt: { type: Date, default: null },
}, { ...opts });

export const trends = (models.trends as mongoose.Model<TrendDoc>) ||
  model<TrendDoc>('trends', trendSchema);

/* ============================================================
   VIDEO_PROJECTS
   ============================================================ */
const videoProjectSchema = new Schema({
  characterId: { type: String, default: null },
  trendId: { type: String, default: null },
  scheduledDate: { type: String, default: null },
  scheduledTime: { type: String, default: null },
  title: { type: String, required: true },
  contentType: { type: String, default: 'talking' },
  status: { type: String, default: 'idea' },
  hook: { type: String, default: null },
  scriptBangla: { type: String, default: null },
  scriptEnglish: { type: String, default: null },
  caption: { type: String, default: null },
  hashtags: { type: [String], default: [] },
  assetRefs: {
    type: Schema.Types.Mixed,
    default: { imageIds: [], audioClipIds: [], frameIds: [] },
  },
  finalVideoPath: { type: String, default: null },
  postedUrl: { type: String, default: null },
  postedAt: { type: String, default: null },
  viewCount: { type: Number, default: null },
  likeCount: { type: Number, default: null },
  commentCount: { type: Number, default: null },
  shareCount: { type: Number, default: null },
  notes: { type: String, default: null },
}, { timestamps: true, ...opts });

export const videoProjects = (models.videoProjects as mongoose.Model<VideoProjectDoc>) ||
  model<VideoProjectDoc>('videoProjects', videoProjectSchema);

/* ============================================================
   PRODUCTION_TASKS
   ============================================================ */
const productionTaskSchema = new Schema({
  videoProjectId: { type: String, required: true },
  taskName: { type: String, required: true },
  taskOrder: { type: Number, default: 0 },
  isDone: { type: Boolean, default: false },
  doneAt: { type: String, default: null },
  notes: { type: String, default: null },
}, { ...opts });

export const productionTasks = (models.productionTasks as mongoose.Model<ProductionTaskDoc>) ||
  model<ProductionTaskDoc>('productionTasks', productionTaskSchema);

/* ============================================================
   EXTRACTED_FRAMES
   ============================================================ */
const extractedFrameSchema = new Schema({
  sourceUrl: { type: String, default: null },
  sourceVideoPath: { type: String, default: null },
  trendId: { type: String, default: null },
  framePath: { type: String, required: true },
  timestampSec: { type: Number, default: null },
  tags: { type: [String], default: [] },
  referenceType: { type: String, default: null },
  savedToLibrary: { type: Boolean, default: false },
  notes: { type: String, default: null },
}, { timestamps: { createdAt: 'createdAt', updatedAt: false }, ...opts });

export const extractedFrames = (models.extractedFrames as mongoose.Model<ExtractedFrameDoc>) ||
  model<ExtractedFrameDoc>('extractedFrames', extractedFrameSchema);

/* ============================================================
   PROMPTS
   ============================================================ */
const promptSchema = new Schema({
  characterId: { type: String, default: null },
  name: { type: String, default: null },
  promptText: { type: String, required: true },
  negativePrompt: { type: String, default: null },
  category: { type: String, default: null },
  seed: { type: Number, default: null },
  resultImageId: { type: String, default: null },
  successCount: { type: Number, default: 1 },
  notes: { type: String, default: null },
}, { timestamps: { createdAt: 'createdAt', updatedAt: false }, ...opts });

export const prompts = (models.prompts as mongoose.Model<PromptDoc>) ||
  model<PromptDoc>('prompts', promptSchema);

/* ============================================================
   SETTINGS
   ============================================================ */
const settingsSchema = new Schema({
  key: { type: String, required: true, unique: true },
  value: { type: Schema.Types.Mixed },
  updatedAt: { type: Date, default: Date.now },
}, { _id: true, ...opts });

export const settings = (models.settings as mongoose.Model<SettingsDoc>) ||
  model<SettingsDoc>('settings', settingsSchema);

/* ============================================================
   POST_QUEUE
   ============================================================ */
const postQueueSchema = new Schema({
  videoProjectId: { type: String, required: true },
  scheduledFor: { type: String, required: true },
  platform: { type: String, default: 'tiktok' },
  reminderSent: { type: Boolean, default: false },
  posted: { type: Boolean, default: false },
}, { timestamps: { createdAt: 'createdAt', updatedAt: false }, ...opts });

export const postQueue = (models.postQueue as mongoose.Model<PostQueueDoc>) ||
  model<PostQueueDoc>('postQueue', postQueueSchema);

/* ============================================================
   Document interfaces (internal Mongoose docs)
   ============================================================ */
interface CharacterDoc {
  name: string;
  personaBible?: Record<string, unknown>;
  visualTraits?: Record<string, unknown>;
  voiceProfile?: Record<string, unknown>;
  masterImageId?: string | null;
  isActive?: boolean;
}

interface ImageDoc {
  characterId?: string | null;
  filePath: string;
  thumbnailPath?: string | null;
  prompt?: string | null;
  negativePrompt?: string | null;
  seed?: number | null;
  source: string;
  model?: string | null;
  width?: number | null;
  height?: number | null;
  tags?: string[];
  qualityScore?: number;
  isMaster?: boolean;
  isFavorite?: boolean;
  notes?: string | null;
}

interface AudioClipDoc {
  characterId?: string | null;
  filePath: string;
  transcript: string;
  language?: string;
  voiceEngine: string;
  voiceId?: string | null;
  rate?: number;
  pitch?: number;
  durationSec?: number | null;
}

interface TrendDoc {
  sourceUrl: string;
  platform?: string | null;
  title?: string | null;
  description?: string | null;
  thumbnailPath?: string | null;
  videoPath?: string | null;
  creator?: string | null;
  hashtags?: string[];
  category?: string | null;
  status?: string;
  lifecycleFlag?: string;
  viewCount?: number | null;
  audioName?: string | null;
  notes?: string | null;
  savedAt?: Date;
  lastCheckedAt?: Date | null;
}

interface VideoProjectDoc {
  characterId?: string | null;
  trendId?: string | null;
  scheduledDate?: string | null;
  scheduledTime?: string | null;
  title: string;
  contentType?: string;
  status?: string;
  hook?: string | null;
  scriptBangla?: string | null;
  scriptEnglish?: string | null;
  caption?: string | null;
  hashtags?: string[];
  assetRefs?: { imageIds: string[]; audioClipIds: string[]; frameIds: string[] };
  finalVideoPath?: string | null;
  postedUrl?: string | null;
  postedAt?: string | null;
  viewCount?: number | null;
  likeCount?: number | null;
  commentCount?: number | null;
  shareCount?: number | null;
  notes?: string | null;
}

interface ProductionTaskDoc {
  videoProjectId: string;
  taskName: string;
  taskOrder?: number;
  isDone?: boolean;
  doneAt?: string | null;
  notes?: string | null;
}

interface ExtractedFrameDoc {
  sourceUrl?: string | null;
  sourceVideoPath?: string | null;
  trendId?: string | null;
  framePath: string;
  timestampSec?: number | null;
  tags?: string[];
  referenceType?: string | null;
  savedToLibrary?: boolean;
  notes?: string | null;
}

interface PromptDoc {
  characterId?: string | null;
  name?: string | null;
  promptText: string;
  negativePrompt?: string | null;
  category?: string | null;
  seed?: number | null;
  resultImageId?: string | null;
  successCount?: number;
  notes?: string | null;
}

interface SettingsDoc {
  key: string;
  value?: unknown;
  updatedAt?: Date;
}

interface PostQueueDoc {
  videoProjectId: string;
  scheduledFor: string;
  platform?: string;
  reminderSent?: boolean;
  posted?: boolean;
}

/* ============================================================
   TypeScript type exports (used by pages/components)
   ============================================================ */
export type Character = {
  id: string;
  name: string;
  personaBible?: Record<string, unknown> | null;
  visualTraits?: Record<string, unknown> | null;
  voiceProfile?: Record<string, unknown> | null;
  masterImageId?: string | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type NewCharacter = Omit<Character, 'id' | 'createdAt' | 'updatedAt'>;

export type Image = {
  id: string;
  characterId?: string | null;
  filePath: string;
  thumbnailPath?: string | null;
  prompt?: string | null;
  negativePrompt?: string | null;
  seed?: number | null;
  source: string;
  model?: string | null;
  width?: number | null;
  height?: number | null;
  tags?: string[];
  qualityScore?: number;
  isMaster?: boolean;
  isFavorite?: boolean;
  notes?: string | null;
  createdAt?: string;
};

export type NewImage = Omit<Image, 'id' | 'createdAt'>;

export type AudioClip = {
  id: string;
  characterId?: string | null;
  filePath: string;
  transcript: string;
  language?: string;
  voiceEngine: string;
  voiceId?: string | null;
  rate?: number;
  pitch?: number;
  durationSec?: number | null;
  createdAt?: string;
};

export type NewAudioClip = Omit<AudioClip, 'id' | 'createdAt'>;

export type Trend = {
  id: string;
  sourceUrl: string;
  platform?: string | null;
  title?: string | null;
  description?: string | null;
  thumbnailPath?: string | null;
  videoPath?: string | null;
  creator?: string | null;
  hashtags?: string[];
  category?: string | null;
  status?: string;
  lifecycleFlag?: string;
  viewCount?: number | null;
  audioName?: string | null;
  notes?: string | null;
  savedAt?: string;
  lastCheckedAt?: string | null;
};

export type NewTrend = Omit<Trend, 'id' | 'savedAt'>;

export type VideoProject = {
  id: string;
  characterId?: string | null;
  trendId?: string | null;
  scheduledDate?: string | null;
  scheduledTime?: string | null;
  title: string;
  contentType?: string | null;
  status?: string | null;
  hook?: string | null;
  scriptBangla?: string | null;
  scriptEnglish?: string | null;
  caption?: string | null;
  hashtags?: string[];
  assetRefs?: { imageIds: string[]; audioClipIds: string[]; frameIds: string[] };
  finalVideoPath?: string | null;
  postedUrl?: string | null;
  postedAt?: string | null;
  viewCount?: number | null;
  likeCount?: number | null;
  commentCount?: number | null;
  shareCount?: number | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type NewVideoProject = Omit<VideoProject, 'id' | 'createdAt' | 'updatedAt'>;

export type ProductionTask = {
  id: string;
  videoProjectId: string;
  taskName: string;
  taskOrder?: number;
  isDone?: boolean;
  doneAt?: string | null;
  notes?: string | null;
};

export type ExtractedFrame = {
  id: string;
  sourceUrl?: string | null;
  sourceVideoPath?: string | null;
  trendId?: string | null;
  framePath: string;
  timestampSec?: number | null;
  tags?: string[];
  referenceType?: string | null;
  savedToLibrary?: boolean;
  notes?: string | null;
  createdAt?: string;
};

export type Prompt = {
  id: string;
  characterId?: string | null;
  name?: string | null;
  promptText: string;
  negativePrompt?: string | null;
  category?: string | null;
  seed?: number | null;
  resultImageId?: string | null;
  successCount?: number;
  notes?: string | null;
  createdAt?: string;
};
