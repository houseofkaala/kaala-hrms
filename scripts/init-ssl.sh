#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${DOMAIN:-${1:-bymarketingonly.com}}"
EMAIL="${EMAIL:-${2:-admin@bymarketingonly.com}}"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$PROJECT_DIR"

echo "Requesting SSL certificate for ${DOMAIN}..."

docker compose run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email \
  -d "$DOMAIN" \
  -d "www.$DOMAIN"

docker compose exec nginx sh -c '
  mv /etc/nginx/conf.d/kaala.conf /etc/nginx/conf.d/kaala-http.conf.disabled 2>/dev/null || true
  cp /etc/nginx/conf.d/kaala-ssl.conf.disabled /etc/nginx/conf.d/kaala.conf
'

docker compose restart nginx

echo "SSL enabled. Access https://${DOMAIN}"