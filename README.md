# Influencer Studio

A self-hosted Next.js dashboard that runs your entire Bangla AI influencer pipeline — character vault, free image generation, unlimited Bangla voice, trend tracking, frame extraction, content calendar, and posting checklists — from one place.

Built to run on a $5/mo VPS using only **free AI APIs**.

---

## What it does

- **Character vault** — locks identity (persona, visual traits, voice) so every video stays consistent
- **Image generation** — free via Cloudflare Workers AI (Flux Schnell) → Pollinations.ai fallback
- **Voice lab** — unlimited free Bangla TTS via Microsoft Edge (Nabanita, Pradeep, Tanishaa, Bashkar)
- **Trend tracker** — paste TikTok/YouTube/Reels URLs, auto-fetches title, hashtags, audio name, thumbnail
- **Frame extractor** — pull reference frames from any video for pose/outfit/lighting refs
- **Content calendar** — plan videos across the month, status pipeline (idea → scripted → produced → ready → posted)
- **Per-project workspace** — Bangla script editor, production checklist, caption + hashtag composer, AI-disclosure reminder, one-click TikTok upload
- **Backup export** — single JSON file containing your entire studio

---

## Stack

Next.js 15 · TypeScript · Tailwind · SQLite + Drizzle · Cloudflare Workers AI · Edge TTS · ffmpeg · yt-dlp · PM2 · Caddy

---

## Quickstart (local dev)

```bash
# Prerequisites: Node 20+, Python 3, ffmpeg, yt-dlp, edge-tts
# (See scripts/setup-vps.sh for one-command install)

npm install
npm run db:generate    # generate Drizzle SQL migrations
npm run db:migrate     # apply to SQLite (creates storage/studio.db)
npm run seed           # seed default character + settings
npm run dev            # http://localhost:3000
```

First-time setup inside the app:

1. **Settings** → paste your Cloudflare Account ID + API token (free tier from [dash.cloudflare.com](https://dash.cloudflare.com) → Workers AI)
2. **Character** → fill in persona, visual traits, voice
3. **Generate** → create 20–30 reference images of your character
4. **Character → Master image** → set the best one as the reference
5. **Calendar** → start planning videos

---

## Cloudflare setup (free, takes 3 minutes)

1. Sign up at [cloudflare.com](https://cloudflare.com)
2. Dashboard → **Workers & Pages** → enable Workers AI (no card required for free tier)
3. Right sidebar → copy your **Account ID**
4. Top right → **My Profile** → **API Tokens** → **Create Token**
5. Use the **"Workers AI"** template → Continue → Create
6. Copy the token, paste both into Settings page

Free tier gives ~10,000 neurons/day ≈ 50–100 Flux Schnell images. Pollinations.ai handles the rest with no key.

---

## Deploying to a VPS (Ubuntu 24.04)

Recommended host: **Hetzner CPX11** (~$5/mo, Helsinki/Nuremberg, 2 vCPU / 2GB RAM) or **DigitalOcean Singapore** ($6/mo, closer to Dhaka, better latency).

### One-command server setup

```bash
ssh root@your-server-ip
git clone https://github.com/YOU/influencer-studio.git /var/www/influencer-studio
cd /var/www/influencer-studio
bash scripts/setup-vps.sh
```

This installs: Node 20, ffmpeg, yt-dlp, edge-tts, Caddy, PM2.

### App setup

```bash
cd /var/www/influencer-studio
npm install
npm run db:generate && npm run db:migrate && npm run seed
npm run build
pm2 start ecosystem.config.cjs
pm2 save && pm2 startup
```

### Point a domain at the server

Edit `/etc/caddy/Caddyfile`:

```
studio.yourdomain.com {
    reverse_proxy localhost:3000
    encode gzip
}
```

DNS: A record for `studio.yourdomain.com` → your server IP. Then:

```bash
systemctl reload caddy
```

Caddy auto-provisions a Let's Encrypt SSL cert. Visit `https://studio.yourdomain.com`.

### Adding basic auth (recommended)

You're the only user. Add basic auth to Caddyfile:

```bash
caddy hash-password    # paste a password, copy the hash
```

```
studio.yourdomain.com {
    basicauth {
        admin <paste-hash-here>
    }
    reverse_proxy localhost:3000
}
```

`systemctl reload caddy` and you're done.

---

## Daily workflow

1. **Trends** — paste 2–3 TikTok URLs in the morning, categorize them
2. **Calendar** — plan today's video, set content type
3. **Generate** — create scene images for the video
4. **Voice** — paste Bangla script, generate audio clips
5. **External tools** — feed image + audio into Hedra (talking) or Kling/Viggle (dance)
6. **CapCut** — assemble, add Bangla subtitles, export 1080×1920
7. **Project → Post tab** — write caption + hashtags, click "Open TikTok Upload"
8. **In TikTok app** — toggle "AI-generated" label, pick licensed music from TikTok's library, post
9. **Project → Posted URL** — paste the resulting TikTok URL to close the loop

---

## Extending with Claude Code

This project ships with a `CLAUDE.md` file at the root that gives Claude Code persistent context about the stack, conventions, and rules. Just run `claude` (or open in Cursor) in the project folder and ask for features. Examples:

```
> add a multi-character switcher to the sidebar
> add a "rewrite this caption with more emotion" button using the OpenAI API
> add IG Reels as a target platform in the calendar
> build a comment-reply drafting tool for posted videos
```

Claude Code will read CLAUDE.md and stay aligned with the architecture.

---

## Backup

Settings → Export backup. Downloads a single JSON with every character, image record, voice clip, trend, project, and setting. Keep weekly.

For full backup including media:

```bash
tar -czf studio-$(date +%F).tar.gz storage/
```

---

## TikTok rules — read this

- **Disclose AI content.** Toggle the "AI-generated" label on every post. Bio: include "AI Creator". Failure to disclose is the fastest way to get suspended.
- **Don't model on real people.** Avoid celebrity likeness, real friends, real public figures.
- **Music rights.** Never download a copyrighted song. Always pick the audio inside the TikTok app from their licensed library. Your final video should be exported silent and you add audio in the app.
- **No automation.** Do not use unofficial APIs to post. This dashboard explicitly does not automate posting — it prepares and reminds.

---

## License

MIT. Use responsibly.
