CREATE TABLE `audio_clips` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`character_id` integer,
	`file_path` text NOT NULL,
	`transcript` text NOT NULL,
	`language` text DEFAULT 'bn-BD',
	`voice_engine` text NOT NULL,
	`voice_id` text,
	`rate` real DEFAULT 1,
	`pitch` real DEFAULT 0,
	`duration_sec` real,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `characters` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`persona_bible` text,
	`visual_traits` text,
	`voice_profile` text,
	`master_image_id` integer,
	`is_active` integer DEFAULT true,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `extracted_frames` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source_url` text,
	`source_video_path` text,
	`trend_id` integer,
	`frame_path` text NOT NULL,
	`timestamp_sec` real,
	`tags` text DEFAULT '[]',
	`reference_type` text,
	`saved_to_library` integer DEFAULT false,
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`trend_id`) REFERENCES `trends`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `images` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`character_id` integer,
	`file_path` text NOT NULL,
	`thumbnail_path` text,
	`prompt` text,
	`negative_prompt` text,
	`seed` integer,
	`source` text DEFAULT 'upload' NOT NULL,
	`model` text,
	`width` integer,
	`height` integer,
	`tags` text DEFAULT '[]',
	`quality_score` integer DEFAULT 0,
	`is_master` integer DEFAULT false,
	`is_favorite` integer DEFAULT false,
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `post_queue` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`video_project_id` integer NOT NULL,
	`scheduled_for` text NOT NULL,
	`platform` text DEFAULT 'tiktok',
	`reminder_sent` integer DEFAULT false,
	`posted` integer DEFAULT false,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`video_project_id`) REFERENCES `video_projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `production_tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`video_project_id` integer NOT NULL,
	`task_name` text NOT NULL,
	`task_order` integer DEFAULT 0,
	`is_done` integer DEFAULT false,
	`done_at` text,
	`notes` text,
	FOREIGN KEY (`video_project_id`) REFERENCES `video_projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `prompts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`character_id` integer,
	`name` text,
	`prompt_text` text NOT NULL,
	`negative_prompt` text,
	`category` text,
	`seed` integer,
	`result_image_id` integer,
	`success_count` integer DEFAULT 1,
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`result_image_id`) REFERENCES `images`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `trends` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source_url` text NOT NULL,
	`platform` text,
	`title` text,
	`description` text,
	`thumbnail_path` text,
	`video_path` text,
	`creator` text,
	`hashtags` text DEFAULT '[]',
	`category` text,
	`status` text DEFAULT 'new',
	`lifecycle_flag` text DEFAULT 'fresh',
	`view_count` integer,
	`audio_name` text,
	`notes` text,
	`saved_at` text DEFAULT CURRENT_TIMESTAMP,
	`last_checked_at` text
);
--> statement-breakpoint
CREATE TABLE `video_projects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`character_id` integer,
	`trend_id` integer,
	`scheduled_date` text,
	`scheduled_time` text,
	`title` text NOT NULL,
	`content_type` text DEFAULT 'talking',
	`status` text DEFAULT 'idea',
	`hook` text,
	`script_bangla` text,
	`script_english` text,
	`caption` text,
	`hashtags` text DEFAULT '[]',
	`asset_refs` text DEFAULT '{"imageIds":[],"audioClipIds":[],"frameIds":[]}',
	`final_video_path` text,
	`posted_url` text,
	`posted_at` text,
	`view_count` integer,
	`like_count` integer,
	`comment_count` integer,
	`share_count` integer,
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`trend_id`) REFERENCES `trends`(`id`) ON UPDATE no action ON DELETE set null
);
