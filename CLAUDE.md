# CLAUDE.md — Project Context

You are working on **Influencer Studio**, a self-hosted dashboard that orchestrates the end-to-end production of a Bangla-speaking AI influencer for TikTok. The user runs this on their own VPS and uses you (Claude Code) to build and extend it.

## Read This First

The user is building a **Bangla-speaking AI influencer for TikTok**. The dashboard's job is to keep the entire workflow — character identity, image library, voice generation, trend tracking, frame extraction, content planning, and posting reminders — in one place. The AI generation happens via **free APIs** (Cloudflare Workers AI, Pollinations.ai, Edge TTS). The dashboard does not call paid APIs.

## Stack

- **Framework:** Next.js 15 (App Router), TypeScript, React 18
- **Styling:** Tailwind CSS + custom CSS variables (editorial dark theme, rose accent)
- **DB:** SQLite via Drizzle ORM (file at `storage/studio.db`)
- **Storage:** Local filesystem at `storage/{images,audio,videos,frames,thumbnails}`
- **AI image:** Cloudflare Workers AI (Flux Schnell), Pollinations.ai fallback
- **TTS:** Edge TTS (Python sidecar, unlimited free Bangla voice)
- **Video:** ffmpeg (frame extraction) + yt-dlp (metadata + downloads)
- **Hosting:** PM2 + Caddy reverse proxy on Ubuntu 24.04 VPS

## Folder map

```
app/                  # Next.js pages (App Router)
  page.tsx              Dashboard home
  character/            Character vault (identity, persona, voice config)
  library/              Image library with filters
  generate/             Image generator (Cloudflare + Pollinations)
  voice/                Voice lab (Bangla Edge TTS)
  trends/               Trend tracker (TikTok/YT/IG URL paste)
  extract/              Frame extractor (ffmpeg)
  calendar/             Content calendar (month grid)
  projects/[id]/        Per-video workspace (script, production, post)
  queue/                Ready-to-post queue
  settings/             Settings & backup export
  api/                  All API routes
lib/
  db/                   schema.ts, client.ts, migrate.ts, seed.ts
  ai/                   cloudflare.ts, pollinations.ts, generate.ts
  tts/                  edge-tts.ts (calls scripts/tts.py)
  video/                ffmpeg.ts, yt-dlp.ts
  utils.ts              cn(), formatRelative(), trendLifecycle(), etc.
components/
  ui/                   shadcn-style primitives (add as needed)
  shared/               sidebar, page-header, empty-state
scripts/
  tts.py                edge-tts Python wrapper
  setup-vps.sh          one-command VPS provisioning
storage/                gitignored runtime data
```

## Design principles

1. **Editorial dark aesthetic.** Fraunces serif headings, Geist sans body, Hind Siliguri for Bangla. Rose accent on near-black. Never use stock purple gradients.
2. **One character at a time.** The active character (where `isActive = true`) drives every generator. Multi-character UI can come later.
3. **All AI is free.** Cloudflare Workers AI for premium quality (Flux Schnell, ~50–100 free images/day). Pollinations.ai as unlimited fallback. Edge TTS for unlimited Bangla voice.
4. **Posting stays semi-manual.** TikTok prohibits unauthorized auto-posting. The dashboard prepares, reminds, and opens TikTok. The final tap is the user's.
5. **AI disclosure is non-negotiable.** Every project's post tab reminds the user to toggle TikTok's AI-generated label.
6. **The character vault is the single source of truth.** Visual traits there get prepended to image prompts. Voice config there is the default everywhere.

## Database conventions

- Timestamps stored as ISO strings (`new Date().toISOString()`)
- JSON columns typed via Drizzle `$type<>`
- File paths stored as absolute server paths in DB but converted to `/storage/...` for client via `toPublic()` helpers
- Soft references: `characterId` is nullable so detached assets still work

## API conventions

- All routes return JSON
- Errors: `{ error: string }` with appropriate HTTP status
- Mutating actions: PATCH for updates, POST for creates, DELETE for removes
- File uploads use `multipart/form-data`

## When adding features

- New screen? Add to `NAV` array in `components/shared/sidebar.tsx`
- New table? Add to `lib/db/schema.ts`, run `npm run db:generate`, then `npm run db:migrate`
- New AI provider? Add to `lib/ai/` and wire into `lib/ai/generate.ts`
- New tool? Always free-tier first. Never add a paid-API dependency without asking.

## What NOT to do

- Don't add paid APIs (OpenAI, Anthropic API for images, ElevenLabs paid, etc.) without explicit user approval. Free-tier integrations only.
- Don't auto-post to TikTok/Instagram. Their TOS forbids it without official API access.
- Don't scrape real people's photos or use celebrity likeness.
- Don't store passwords or tokens in plaintext config files — use the Settings table (encrypted at rest by SQLite WAL when configured).
- Don't add server-side analytics, telemetry, or any external network calls beyond the configured AI providers.

## Future phases (not yet built)

- Phase 5+ features in the original plan: continuity checker, performance tracker with TikTok scraping, comment reply drafts, competitor watchlist, mobile-responsive polish, multi-character support.
- LoRA training UI (would require GPU access — separate compute concern)
- Webhook integration with iOS Shortcuts for posting reminders

## Running locally

```bash
npm install
npm run db:generate     # generate Drizzle migrations
npm run db:migrate      # apply to SQLite
npm run seed            # seed default character + settings
npm run dev             # http://localhost:3000
```

## Deploying to VPS

```bash
# On VPS (Ubuntu 24.04)
bash scripts/setup-vps.sh    # installs Node, ffmpeg, yt-dlp, edge-tts, Caddy
cd /var/www/influencer-studio
npm install --production=false
npm run db:generate && npm run db:migrate && npm run seed
npm run build
pm2 start ecosystem.config.cjs
pm2 save && pm2 startup
# Edit /etc/caddy/Caddyfile to point at your domain, then:
systemctl reload caddy
```

## Quick reference: Bangla voices

```
bn-BD-NabanitaNeural  female, Bangladesh   (recommended default)
bn-BD-PradeepNeural   male,   Bangladesh
bn-IN-TanishaaNeural  female, India
bn-IN-BashkarNeural   male,   India
```
