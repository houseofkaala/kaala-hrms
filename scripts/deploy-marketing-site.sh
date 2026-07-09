#!/usr/bin/env bash
# Deploy the By Marketing Only main website to the VPS apex domain.
# Usage (from Mac): ./scripts/deploy-marketing-site.sh [path-to-BMO-website]
set -euo pipefail

DOMAIN="${DOMAIN:-bymarketingonly.com}"
VPS_HOST="${VPS_HOST:-root@200.97.162.24}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/kaala_vps}"
SITE_SRC="${1:-$HOME/Downloads/BY MARKETING ONLY LLP/untitled folder/BMO website}"
REMOTE_DIR="/var/www/bymarketingonly"

if [ ! -f "$SITE_SRC/index.html" ]; then
  echo "Marketing site not found at: $SITE_SRC"
  echo "Usage: $0 /path/to/BMO\\ website"
  exit 1
fi

echo "==> Uploading marketing site to ${VPS_HOST}:${REMOTE_DIR}"
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new "$VPS_HOST" "mkdir -p ${REMOTE_DIR}"

rsync -avz --delete \
  --exclude '.DS_Store' \
  --exclude '.claude/' \
  --exclude '*.exe' \
  -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=accept-new" \
  "$SITE_SRC/" "${VPS_HOST}:${REMOTE_DIR}/"

echo "==> Updating Caddy (apex → marketing site, subdomains → HRMS)"
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new "$VPS_HOST" "tee /etc/caddy/Caddyfile >/dev/null" <<EOF
{
    email admin@${DOMAIN}
}

employee.${DOMAIN}, admin.${DOMAIN} {
    reverse_proxy 127.0.0.1:3000
}

sales.${DOMAIN} {
    redir https://employee.${DOMAIN}{uri} permanent
}

${DOMAIN}, www.${DOMAIN} {
    root * ${REMOTE_DIR}
    file_server
    encode gzip
}
EOF

ssh -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new "$VPS_HOST" "systemctl reload caddy"
echo "Done. https://${DOMAIN} should show your main website."