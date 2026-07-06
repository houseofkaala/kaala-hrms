#!/usr/bin/env bash
# Lightweight deploy for Oracle E2.1.Micro (1 GB RAM) — no Docker.
# Run ON the Oracle VM after: git clone && cd kaala-hrms
set -euo pipefail

DOMAIN="${DOMAIN:-bymarketingonly.com}"
EMAIL="${EMAIL:-admin@bymarketingonly.com}"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$PROJECT_DIR"

echo "==> Installing Node 20 + Caddy (lightweight SSL)..."
sudo apt-get update -qq
sudo apt-get install -y curl git debian-keyring debian-archive-keyring apt-transport-https

if ! command -v node &>/dev/null || [[ "$(node -v)" != v20* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

if ! command -v caddy &>/dev/null; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
  sudo apt-get update -qq
  sudo apt-get install -y caddy
fi

echo "==> Building app..."
npm ci
npm run build

if [ ! -f .env ]; then cp .env.example .env; fi
sed -i "s|^APP_URL=.*|APP_URL=https://${DOMAIN}|" .env

echo "==> Caddy reverse proxy..."
sudo tee /etc/caddy/Caddyfile > /dev/null <<EOF
${DOMAIN}, www.${DOMAIN} {
    reverse_proxy localhost:3000
    email ${EMAIL}
}
EOF

sudo systemctl enable caddy
sudo systemctl restart caddy

echo "==> Systemd service for HRMS..."
sudo tee /etc/systemd/system/kaala-hrms.service > /dev/null <<EOF
[Unit]
Description=House of Kaala HRMS
After=network.target

[Service]
Type=simple
User=$(whoami)
WorkingDirectory=${PROJECT_DIR}
Environment=NODE_ENV=production
Environment=PORT=3000
EnvironmentFile=${PROJECT_DIR}/.env
ExecStart=/usr/bin/node dist/server.cjs
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable kaala-hrms
sudo systemctl restart kaala-hrms

echo ""
echo "Deployed on E2.1.Micro (no Docker)."
echo "  https://${DOMAIN}"
echo ""
echo "Hostinger DNS:"
PUBLIC_IP=$(curl -4 -s ifconfig.me)
echo "  A  @   -> ${PUBLIC_IP}"
echo "  CNAME www -> ${DOMAIN}"