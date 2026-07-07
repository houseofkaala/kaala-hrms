#!/usr/bin/env bash
# DNS instructions for Hostinger VPS (replaces Render CNAME setup)

DOMAIN="${DOMAIN:-bymarketingonly.com}"
VPS_IP="${VPS_IP:-YOUR_VPS_IP}"

cat <<EOF

HOSTINGER VPS DNS — ${DOMAIN}
==============================

1. Buy / open your Hostinger VPS → note the public IP address.

2. hpanel.hostinger.com → Domains → ${DOMAIN} → DNS / DNS Zone

3. REMOVE old Render records (if any):
   - CNAME employee → kaala-hrms.onrender.com
   - CNAME admin    → kaala-hrms.onrender.com

4. ADD these A records (all point to your VPS IP):

   | Type | Name     | Points to | TTL  |
   |------|----------|-----------|------|
   | A    | employee | ${VPS_IP} | 3600 |
   | A    | admin    | ${VPS_IP} | 3600 |
   | A    | @        | ${VPS_IP} | 3600 |
   | A    | www      | ${VPS_IP} | 3600 |

5. SSH into VPS and deploy:

   ssh root@YOUR_VPS_IP
   apt update && apt install -y git
   git clone https://github.com/houseofkaala/kaala-hrms.git
   cd kaala-hrms
   cp .env.example .env
   nano .env   # set SEED_*_PASSWORD values
   chmod +x scripts/*.sh
   ./scripts/deploy-hostinger-vps.sh

6. After DNS propagates (10–30 min), test:

   Employee portal: https://employee.${DOMAIN}
   Admin portal:    https://admin.${DOMAIN}

7. You can shut down / delete the Render service (optional).

Data on VPS is stored in /var/lib/kaala-hrms/data — it survives reboots and redeploys.

EOF