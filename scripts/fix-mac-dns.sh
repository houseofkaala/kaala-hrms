#!/usr/bin/env bash
# Remove Render DNS cache from Mac and point HRMS to Hostinger VPS.
set -euo pipefail

VPS_IP="${VPS_IP:-200.97.162.24}"
DOMAIN="${DOMAIN:-bymarketingonly.com}"
HOSTS="/etc/hosts"
MARKER="# kaala-hrms-vps"

echo "==> Cleaning old Render/HRMS entries from ${HOSTS}..."
sudo cp "${HOSTS}" "${HOSTS}.bak.$(date +%s)"
sudo sed -i '' \
  -e '/onrender\.com/d' \
  -e '/kaala-hrms\.onrender/d' \
  -e '/render\.com/d' \
  -e '/kaala-hrms-vps/d' \
  -e "/${DOMAIN}/d" \
  "${HOSTS}" 2>/dev/null || sudo sed -i \
  -e '/onrender\.com/d' \
  -e '/kaala-hrms\.onrender/d' \
  -e '/render\.com/d' \
  -e '/kaala-hrms-vps/d' \
  -e "/${DOMAIN}/d" \
  "${HOSTS}"

echo "==> Pointing HRMS subdomains to VPS ${VPS_IP}..."
sudo tee -a "${HOSTS}" >/dev/null <<EOF
${MARKER}
${VPS_IP} admin.${DOMAIN}
${VPS_IP} employee.${DOMAIN}
${VPS_IP} sales.${DOMAIN}
${VPS_IP} ${DOMAIN}
${VPS_IP} www.${DOMAIN}
EOF

echo "==> Flushing macOS DNS cache..."
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder 2>/dev/null || true
sudo killall mDNSResponderHelper 2>/dev/null || true

echo "==> Removing Render CLI config (if any)..."
rm -rf "${HOME}/.render" "${HOME}/.config/render" 2>/dev/null || true
npm uninstall -g @render/cli render-cli 2>/dev/null || true

echo ""
echo "Done. Open in Chrome:"
echo "  https://admin.${DOMAIN}"
echo "  https://employee.${DOMAIN}"
echo "  https://sales.${DOMAIN}"
echo ""
echo "Admin login: admin@${DOMAIN}"
echo "Password:    Kaala@Admin2026!"
echo ""
echo "Backup hosts file saved as ${HOSTS}.bak.*"