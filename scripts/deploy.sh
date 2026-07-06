#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${DOMAIN:-bymarketingonly.com}"
EMAIL="${EMAIL:-admin@bymarketingonly.com}"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$PROJECT_DIR"

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example — review before production use."
fi

echo "Building and starting House of Kaala HRMS..."
docker compose build
docker compose up -d

echo ""
echo "Deployment started."
echo "  HTTP:  http://${DOMAIN}"
echo ""
echo "Next steps for HTTPS:"
echo "  1. Point DNS A record: ${DOMAIN} -> your server public IP"
echo "  2. Wait for DNS propagation (5-30 minutes)"
echo "  3. Run: DOMAIN=${DOMAIN} EMAIL=${EMAIL} ./scripts/init-ssl.sh"
echo ""
echo "Demo logins:"
echo "  john.doe@kaala.io / Demo@123"
echo "  mike.m@kaala.io   / Demo@123"
echo "  alice.a@kaala.io  / Admin@123"