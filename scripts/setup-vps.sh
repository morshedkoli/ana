#!/bin/bash
# VPS Setup Script for Ubuntu 24.04
# Run as root or with sudo
#
# What this installs:
#   - Node.js 20, npm, pm2 (app runtime)
#   - Caddy (reverse proxy + auto-HTTPS)
#
# What this does NOT install (handled by the app at runtime):
#   - yt-dlp        → standalone binary auto-downloaded into ./storage/bin/
#                     on first trend save, or via `npm run prepare-binaries`
#                     during deploy.
#   - ffmpeg        → bundled via the `ffmpeg-static` + `ffprobe-static` npm
#                     packages, so it lives in node_modules. No apt install
#                     needed; works on every supported architecture out of
#                     the box.
#   - edge-tts      → optional. The app supports 5 other free TTS engines that
#                     don't need it (StreamElements, Google Translate TTS,
#                     Pollinations, Hugging Face, ElevenLabs). If you want
#                     Edge TTS Bangla voices specifically, install it manually:
#                       pip3 install --break-system-packages -U edge-tts

set -e

echo "▶ Updating system…"
apt-get update && apt-get upgrade -y

echo "▶ Installing base packages…"
apt-get install -y curl git build-essential

echo "▶ Installing Node.js 20…"
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

echo "▶ Installing pm2…"
npm install -g pm2

echo "▶ Installing Caddy…"
apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt-get update
apt-get install -y caddy

echo "▶ Verifying installations…"
node --version
npm --version
caddy version

echo ""
echo "✓ VPS setup complete!"
echo ""
echo "Next steps:"
echo "  1. cd into the project folder (e.g. /var/www/ana)"
echo "  2. npm install"
echo "  3. npm run prepare-binaries   # downloads yt-dlp to ./storage/bin"
echo "  4. npm run db:migrate && npm run seed"
echo "  5. npm run build"
echo "  6. pm2 start ecosystem.config.cjs && pm2 save && pm2 startup"
echo "  7. Edit /etc/caddy/Caddyfile with your domain, then: systemctl reload caddy"
echo ""
echo "Tip: yt-dlp lives inside the app folder, not system-wide. To update it:"
echo "  npm run prepare-binaries   # re-runs the download (idempotent)"
echo "  or click 'update binary' in the Trend tracker UI"
