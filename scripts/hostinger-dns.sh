#!/usr/bin/env bash
# Hostinger DNS for bymarketingonly.com → kaala-hrms.onrender.com

cat <<'EOF'

HOSTINGER DNS — bymarketingonly.com
===================================

1. Render dashboard → kaala-hrms → Settings → Custom Domains
   → Add: bymarketingonly.com
   → (Render also adds www.bymarketingonly.com automatically)

2. hpanel.hostinger.com → Domains → bymarketingonly.com → DNS / DNS Zone

3. DELETE any existing A or AAAA records for @ if they conflict.
   (Remove AAAA records — Render uses IPv4 only.)

4. ADD these records:

   | Type  | Name | Value                    | TTL  |
   |-------|------|--------------------------|------|
   | A     | @    | 216.24.57.1              | 3600 |
   | CNAME | www  | kaala-hrms.onrender.com  | 3600 |

5. Render → Custom Domains → click VERIFY next to bymarketingonly.com

6. Wait 10–30 min, then open: https://bymarketingonly.com

7. Render → Environment → confirm APP_URL = https://bymarketingonly.com

Demo login: john.doe@kaala.io / Demo@123

Note: Free Render tier sleeps after 15 min idle. First visit may take ~60 sec.

EOF