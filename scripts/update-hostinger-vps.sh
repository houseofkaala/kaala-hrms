#!/usr/bin/env bash
# Pull latest code and restart HRMS on Hostinger VPS.
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

if [ -x scripts/backup-data.sh ]; then
  echo "==> Backing up data..."
  ./scripts/backup-data.sh
fi

echo "==> Pulling latest..."
git pull origin main

echo "==> Installing dependencies..."
npm ci

echo "==> Building..."
npm run build

echo "==> Restarting service..."
sudo systemctl restart kaala-hrms

sleep 2
if curl -fsS http://127.0.0.1:3000/api/health >/dev/null; then
  echo "HRMS is healthy."
else
  echo "Health check failed — run: sudo journalctl -u kaala-hrms -n 50"
  exit 1
fi