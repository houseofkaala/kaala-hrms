#!/usr/bin/env bash
# Go live NOW when Oracle A1 is out of capacity.
# Free: Render hosting + Hostinger DNS + HTTPS
set -euo pipefail

DOMAIN="${DOMAIN:-bymarketingonly.com}"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cat <<EOF

================================================================
  GO LIVE NOW — Render (free) + Hostinger DNS
  Domain: https://${DOMAIN}
  Use this while Oracle A1 has no capacity
================================================================

STEP 1 — Push to GitHub (if not done)
--------------------------------------
  cd ${PROJECT_DIR}
  ./scripts/push-github.sh YOUR_GITHUB_USERNAME kaala-hrms
  git push -u origin main


STEP 2 — Deploy on Render (free, ~5 min)
----------------------------------------
  1. https://dashboard.render.com/register
  2. New → Blueprint
  3. Connect GitHub repo: kaala-hrms
  4. Render reads render.yaml and deploys
  5. Note your service URL: kaala-hrms.onrender.com


STEP 3 — Hostinger DNS for ${DOMAIN}
------------------------------------
  1. https://hpanel.hostinger.com
  2. Domains → ${DOMAIN} → DNS / DNS Zone

  OPTION A — Root domain (recommended by Render):
    Render dashboard → your service → Settings → Custom Domains
    → Add "${DOMAIN}"
    → Render shows exact DNS records. Copy them into Hostinger.

    Typically:
      Type: CNAME (or ALIAS if Hostinger supports apex CNAME)
      Name: @
      Value: kaala-hrms.onrender.com

    If Hostinger does NOT allow CNAME on @ (common):
      Use the A record IP that Render provides for apex domains,
      OR point only www and redirect apex in Hostinger:

      A     @    → (IP from Render custom domain page)
      CNAME www  → kaala-hrms.onrender.com

  OPTION B — www only (simpler on Hostinger):
      CNAME www → kaala-hrms.onrender.com
    Then in Hostinger → Redirect @ to https://www.${DOMAIN}


STEP 4 — Render environment
---------------------------
  Settings → Environment:
    APP_URL = https://${DOMAIN}


STEP 5 — Verify
---------------
  https://${DOMAIN}  (or https://www.${DOMAIN})
  First visit after idle may take ~60 sec (free tier wake-up)


FREE TIER LIMITS (Render)
-------------------------
  • Sleeps after 15 min with no traffic
  • ~1 min cold start on first visit
  • Data resets on redeploy (demo users auto-reseed)
  • 750 free hours/month
  • Custom domain + HTTPS: included


WHEN ORACLE CAPACITY OPENS
--------------------------
  Migrate to Oracle for always-on + persistent data:
  ./scripts/oracle-capacity-workarounds.sh
  ./scripts/deploy-oracle.sh

EOF