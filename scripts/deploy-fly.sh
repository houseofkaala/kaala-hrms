#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${DOMAIN:-bymarketingonly.com}"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$PROJECT_DIR"

if ! command -v fly &>/dev/null; then
  echo "Install Fly CLI: curl -L https://fly.io/install.sh | sh"
  exit 1
fi

echo "Deploying to Fly.io (free allowance + persistent data volume)..."

fly launch --no-deploy --copy-config --name kaala-hrms 2>/dev/null || true
fly volumes create kaala_data --region bom --size 1 2>/dev/null || true
fly deploy

echo ""
echo "Add custom domain:"
echo "  fly certs add ${DOMAIN}"
echo "  fly certs add www.${DOMAIN}"
echo ""
echo "DNS at your registrar (bymarketingonly.com):"
echo "  A    @    → Fly IPv4 (fly ips list -v)"
echo "  AAAA @    → Fly IPv6"
echo "  CNAME www → kaala-hrms.fly.dev"
echo ""
echo "Then open: https://${DOMAIN}"