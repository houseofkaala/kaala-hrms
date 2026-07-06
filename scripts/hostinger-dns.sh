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

6. Set passwords in Render → Environment (SEED_*_PASSWORD variables)

7. Test with your real accounts:

   Employee: https://employee.bymarketingonly.com
   Admin:    https://admin.bymarketingonly.com

Local dev:
  ?portal=employee  or  ?portal=admin

EOF