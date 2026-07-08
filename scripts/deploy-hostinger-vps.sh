#!/usr/bin/env bash
# Deploy House of Kaala HRMS on a Hostinger VPS (Ubuntu).
# Run ON the VPS after cloning the repo:
#   git clone https://github.com/houseofkaala/kaala-hrms.git
#   cd kaala-hrms
#   chmod +x scripts/*.sh
#   ./scripts/deploy-hostinger-vps.sh
set -euo pipefail

DOMAIN="${DOMAIN:-bymarketingonly.com}"
EMAIL="${EMAIL:-admin@${DOMAIN}}"
EMPLOYEE_HOST="employee.${DOMAIN}"
ADMIN_HOST="admin.${DOMAIN}"
SALES_HOST="sales.${DOMAIN}"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DATA_DIR="/var/lib/kaala-hrms/data"
SERVICE_USER="${SUDO_USER:-$(whoami)}"

cd "$PROJECT_DIR"

echo "=============================================="
echo " House of Kaala HRMS — Hostinger VPS deploy"
echo "=============================================="
echo "Domain:   ${DOMAIN}"
echo "Employee: https://${EMPLOYEE_HOST}"
echo "Admin:    https://${ADMIN_HOST}"
echo ""

require_env() {
  local key="$1"
  local val="${!key:-}"
  if [ -z "$val" ]; then
    echo "Missing ${key}. Add it to .env or export before running."
    return 1
  fi
}

setup_env() {
  if [ ! -f .env ]; then
    cp .env.example .env
    echo "Created .env from .env.example"
  fi

  read_env() {
    grep -E "^${1}=" .env | head -1 | cut -d= -f2- | sed 's/^["'\'']//; s/["'\'']$//'
  }

  export SEED_ADMIN_PASSWORD="$(read_env SEED_ADMIN_PASSWORD)"
  export SEED_MANAGER_PASSWORD="$(read_env SEED_MANAGER_PASSWORD)"
  export SEED_EMPLOYEE_PASSWORD="$(read_env SEED_EMPLOYEE_PASSWORD)"

  local missing=0
  [ -n "$SEED_ADMIN_PASSWORD" ] || missing=1
  [ -n "$SEED_MANAGER_PASSWORD" ] || missing=1
  [ -n "$SEED_EMPLOYEE_PASSWORD" ] || missing=1
  if [ "$missing" -eq 1 ]; then
    echo ""
    echo "Edit ${PROJECT_DIR}/.env and set:"
    echo "  SEED_ADMIN_PASSWORD=your-strong-password"
    echo "  SEED_MANAGER_PASSWORD=your-strong-password"
    echo "  SEED_EMPLOYEE_PASSWORD=your-strong-password"
    echo "  VITE_BASE_DOMAIN=${DOMAIN}"
    echo ""
    echo "Then re-run: ./scripts/deploy-hostinger-vps.sh"
    exit 1
  fi

  grep -q '^VITE_BASE_DOMAIN=' .env && sed -i "s|^VITE_BASE_DOMAIN=.*|VITE_BASE_DOMAIN=${DOMAIN}|" .env || echo "VITE_BASE_DOMAIN=${DOMAIN}" >> .env
  grep -q '^APP_URL=' .env && sed -i "s|^APP_URL=.*|APP_URL=https://${EMPLOYEE_HOST}|" .env || echo "APP_URL=https://${EMPLOYEE_HOST}" >> .env
  grep -q '^NODE_ENV=' .env || echo "NODE_ENV=production" >> .env
  grep -q '^PORT=' .env || echo "PORT=3000" >> .env
  grep -q '^TZ=' .env || echo "TZ=Asia/Kolkata" >> .env
}

install_packages() {
  echo "==> Installing system packages..."
  sudo apt-get update -qq
  sudo apt-get install -y curl git ufw debian-keyring debian-archive-keyring apt-transport-https

  if ! command -v node &>/dev/null || [[ "$(node -v 2>/dev/null || echo v0)" != v20* ]]; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
  fi

  if ! command -v caddy &>/dev/null; then
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
    sudo apt-get update -qq
    sudo apt-get install -y caddy
  fi
}

setup_data_dir() {
  echo "==> Persistent data directory..."
  sudo mkdir -p "$DATA_DIR"
  sudo chown -R "${SERVICE_USER}:${SERVICE_USER}" /var/lib/kaala-hrms
  if [ -L data ]; then
    :
  elif [ -d data ] && [ "$(ls -A data 2>/dev/null)" ]; then
    cp -a data/. "$DATA_DIR/" 2>/dev/null || true
    rm -rf data
    ln -s "$DATA_DIR" data
  else
    rm -rf data 2>/dev/null || true
    ln -s "$DATA_DIR" data
  fi
}

build_app() {
  echo "==> Building application..."
  npm ci
  npm run build
}

setup_caddy() {
  echo "==> Configuring Caddy (HTTPS reverse proxy)..."
  sudo tee /etc/caddy/Caddyfile >/dev/null <<EOF
{
    email ${EMAIL}
}

${EMPLOYEE_HOST}, ${ADMIN_HOST} {
    reverse_proxy 127.0.0.1:3000
}

${SALES_HOST} {
    redir https://${EMPLOYEE_HOST}{uri} permanent
}

${DOMAIN}, www.${DOMAIN} {
    redir https://${EMPLOYEE_HOST}{uri} permanent
}
EOF

  sudo systemctl enable caddy
  sudo systemctl restart caddy
}

setup_systemd() {
  echo "==> Systemd service..."
  sudo tee /etc/systemd/system/kaala-hrms.service >/dev/null <<EOF
[Unit]
Description=House of Kaala HRMS
After=network.target caddy.service
Wants=caddy.service

[Service]
Type=simple
User=${SERVICE_USER}
WorkingDirectory=${PROJECT_DIR}
Environment=NODE_ENV=production
Environment=PORT=3000
EnvironmentFile=${PROJECT_DIR}/.env
ExecStart=/usr/bin/node dist/server.cjs
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

  sudo systemctl daemon-reload
  sudo systemctl enable kaala-hrms
  sudo systemctl restart kaala-hrms
}

setup_firewall() {
  echo "==> Firewall..."
  sudo ufw allow OpenSSH >/dev/null 2>&1 || true
  sudo ufw allow 80/tcp >/dev/null 2>&1 || true
  sudo ufw allow 443/tcp >/dev/null 2>&1 || true
  echo "y" | sudo ufw enable >/dev/null 2>&1 || true
}

print_dns() {
  PUBLIC_IP="$(curl -4 -s --max-time 10 ifconfig.me || curl -4 -s --max-time 10 icanhazip.com || hostname -I | awk '{print $1}')"
  echo ""
  echo "=============================================="
  echo " DEPLOYED — set DNS in Hostinger hPanel"
  echo "=============================================="
  echo ""
  echo "hpanel.hostinger.com → Domains → ${DOMAIN} → DNS"
  echo ""
  echo "| Type | Name     | Points to    | TTL  |"
  echo "|------|----------|--------------|------|"
  echo "| A    | employee | ${PUBLIC_IP} | 3600 |"
  echo "| A    | admin    | ${PUBLIC_IP} | 3600 |"
  echo "| A    | sales    | ${PUBLIC_IP} | 3600 |"
  echo "| A    | @        | ${PUBLIC_IP} | 3600 |"
  echo "| A    | www      | ${PUBLIC_IP} | 3600 |"
  echo ""
  echo "Remove old Render CNAMEs (employee/admin → onrender.com) if present."
  echo ""
  echo "Wait 10–30 min for DNS, then test:"
  echo "  https://${EMPLOYEE_HOST}"
  echo "  https://${ADMIN_HOST}"
  echo "  https://${SALES_HOST}  (redirects to employee portal)"
  echo ""
  echo "Admin login:  admin@${DOMAIN}"
  echo "Data stored:  ${DATA_DIR}/store.json (persists across reboots)"
  echo ""
  echo "Useful commands:"
  echo "  sudo systemctl status kaala-hrms"
  echo "  sudo journalctl -u kaala-hrms -f"
  echo "  ./scripts/update-hostinger-vps.sh"
  echo ""
}

setup_env
install_packages
setup_data_dir
build_app
setup_caddy
setup_systemd
setup_firewall
sleep 3
print_dns