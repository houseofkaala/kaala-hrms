#!/usr/bin/env bash
# Run this ON your Oracle Cloud VM after cloning the repo.
set -euo pipefail

DOMAIN="${DOMAIN:-bymarketingonly.com}"
EMAIL="${EMAIL:-admin@bymarketingonly.com}"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$PROJECT_DIR"

echo "==> Installing Docker..."
sudo apt-get update -qq
sudo apt-get install -y docker.io docker-compose-plugin git curl
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker "$USER" 2>/dev/null || true

if ! groups | grep -q docker; then
  echo "Docker group added. Run: newgrp docker"
  echo "Then re-run: ./scripts/oracle-vm-setup.sh"
  exit 0
fi

echo "==> Configuring environment..."
if [ ! -f .env ]; then
  cp .env.example .env
fi
if grep -q '^APP_URL=' .env; then
  sed -i "s|^APP_URL=.*|APP_URL=https://${DOMAIN}|" .env
else
  echo "APP_URL=https://${DOMAIN}" >> .env
fi

chmod +x scripts/*.sh

echo "==> Building and starting containers..."
./scripts/deploy.sh

echo ""
echo "==> Checking DNS before SSL..."
PUBLIC_IP=$(curl -4 -s ifconfig.me || curl -4 -s icanhazip.com)
echo "This server's public IP: ${PUBLIC_IP}"
echo "Hostinger DNS must have:  A  @  ->  ${PUBLIC_IP}"
echo ""
read -r -p "DNS configured and propagated? (y/N) " READY
if [[ ! "${READY}" =~ ^[Yy]$ ]]; then
  echo "Set DNS in Hostinger first, wait 10-30 min, then run:"
  echo "  DOMAIN=${DOMAIN} EMAIL=${EMAIL} ./scripts/init-ssl.sh"
  exit 0
fi

DOMAIN="${DOMAIN}" EMAIL="${EMAIL}" ./scripts/init-ssl.sh

echo ""
echo "Done! Open https://${DOMAIN}"