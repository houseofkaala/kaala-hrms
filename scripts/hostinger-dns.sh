#!/usr/bin/env bash
# Hostinger DNS — points to your VPS (recommended) or Render (legacy)

MODE="${1:-vps}"
DOMAIN="${DOMAIN:-bymarketingonly.com}"

if [ "$MODE" = "render" ]; then
  cat <<EOF

HOSTINGER DNS — ${DOMAIN} (Render — legacy)
============================================

  | Type  | Name     | Value                   |
  |-------|----------|-------------------------|
  | CNAME | employee | kaala-hrms.onrender.com |
  | CNAME | admin    | kaala-hrms.onrender.com |

EOF
  exit 0
fi

exec "$(dirname "$0")/hostinger-vps-dns.sh"