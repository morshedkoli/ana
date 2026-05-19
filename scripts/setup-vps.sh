#!/bin/bash
# VPS Setup Script for Ubuntu 24.04
# Run as root or with sudo
set -e

echo "▶ Updating system…"
apt-get update && apt-get upgrade -y

echo "▶ Installing base packages…"
apt-get install -y curl git build-essential python3 python3-pip ffmpeg

echo "▶ Installing Node.js 20…"
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

echo "▶ Installing pnpm + pm2…"
npm install -g pm2

echo "▶ Installing yt-dlp…"
pip3 install --break-system-packages -U yt-dlp

echo "▶ Installing edge-tts (Bangla voice)…"
pip3 install --break-system-packages -U edge-tts

echo "▶ Installing Caddy…"
apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt-get update
apt-get install -y caddy

echo "▶ Verifying installations…"
node --version
npm --version
ffmpeg -version | head -1
yt-dlp --version
edge-tts --list-voices | grep bn-BD | head -2
caddy version

echo ""
echo "✓ VPS setup complete!"
echo ""
echo "Next steps:"
echo "  1. cd into the project folder"
echo "  2. npm install"
echo "  3. npm run db:generate && npm run db:migrate && npm run seed"
echo "  4. npm run build"
echo "  5. pm2 start ecosystem.config.cjs && pm2 save && pm2 startup"
echo "  6. Edit /etc/caddy/Caddyfile with your domain, then: systemctl reload caddy"
