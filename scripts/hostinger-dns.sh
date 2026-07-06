#!/usr/bin/env bash
# Hostinger DNS — role-based subdomains for House of Kaala HRMS

cat <<'EOF'

HOSTINGER DNS — bymarketingonly.com (3 portals)
================================================

1. Render dashboard → kaala-hrms → Settings → Custom Domains
   Add ALL of these:
     • employee.bymarketingonly.com
     • manager.bymarketingonly.com
     • admin.bymarketingonly.com

2. hpanel.hostinger.com → Domains → bymarketingonly.com → DNS / DNS Zone

3. Remove conflicting A/AAAA records for subdomains if present.

4. ADD these CNAME records (all point to Render):

   | Type  | Name     | Value                   | TTL  |
   |-------|----------|-------------------------|------|
   | CNAME | employee | kaala-hrms.onrender.com | 3600 |
   | CNAME | manager  | kaala-hrms.onrender.com | 3600 |
   | CNAME | admin    | kaala-hrms.onrender.com | 3600 |

5. Render → Custom Domains → VERIFY each subdomain

6. Wait 10–30 min, then test:

   Employee: https://employee.bymarketingonly.com  (john.doe@kaala.io / Demo@123)
   Manager:  https://manager.bymarketingonly.com   (mike.m@kaala.io / Demo@123)
   Admin:    https://admin.bymarketingonly.com     (alice.a@kaala.io / Admin@123)

Each portal only accepts its role. Wrong portal → login blocked with redirect hint.

Local dev: http://localhost:3000?portal=employee|manager|admin

EOF