#!/usr/bin/env bash
# Hostinger DNS — employee + admin portals only

cat <<'EOF'

HOSTINGER DNS — bymarketingonly.com (2 portals)
================================================

1. Render dashboard → kaala-hrms → Settings → Custom Domains
   Add:
     • employee.bymarketingonly.com
     • admin.bymarketingonly.com

2. hpanel.hostinger.com → Domains → bymarketingonly.com → DNS / DNS Zone

3. ADD these CNAME records:

   | Type  | Name     | Value                   | TTL  |
   |-------|----------|-------------------------|------|
   | CNAME | employee | kaala-hrms.onrender.com | 3600 |
   | CNAME | admin    | kaala-hrms.onrender.com | 3600 |

4. REMOVE manager CNAME if you added it earlier (no longer used).

5. Render → Custom Domains → VERIFY each subdomain

6. Test:

   Employee: https://employee.bymarketingonly.com
             john.doe@kaala.io / Demo@123

   Admin:    https://admin.bymarketingonly.com
             mike.m@kaala.io / Demo@123  (Manager)
             alice.a@kaala.io / Admin@123 (Admin)

Local dev:
  ?portal=employee  or  ?portal=admin

EOF