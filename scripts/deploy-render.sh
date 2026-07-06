#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${DOMAIN:-bymarketingonly.com}"

cat <<EOF

============================================================
  Deploy House of Kaala HRMS — FREE on Render
  Domain: https://${DOMAIN}
============================================================

STEP 1 — Push code to GitHub
  cd $(cd "$(dirname "$0")/.." && pwd)
  git init
  git add .
  git commit -m "Deploy HRMS"
  # Create a repo on github.com, then:
  git remote add origin https://github.com/YOUR_USERNAME/kaala-hrms.git
  git push -u origin main

STEP 2 — Deploy on Render (free)
  1. Go to https://dashboard.render.com/register
  2. New → Blueprint
  3. Connect your GitHub repo
  4. Render reads render.yaml and deploys automatically
  5. Wait ~5 minutes for the first build

STEP 3 — Add your custom domain (free SSL included)
  1. In Render dashboard → your service → Settings → Custom Domains
  2. Add: ${DOMAIN}
  3. Render shows DNS records — add them at your domain registrar:

     For root domain (${DOMAIN}):
       Type: ANAME or ALIAS → Render hostname (e.g. kaala-hrms.onrender.com)
       OR Type: A → IP address Render provides

     Optional www:
       Type: CNAME → www → kaala-hrms.onrender.com

  4. If your registrar is Cloudflare (free DNS):
     - Add site bymarketingonly.com
     - Use the CNAME/ALIAS records Render gives you
     - Set SSL mode to "Full"

STEP 4 — Update APP_URL in Render
  Environment → APP_URL = https://${DOMAIN}

FREE TIER NOTES:
  - App sleeps after 15 min idle (~1 min wake-up on first visit)
  - Data resets on redeploy (demo logins re-seed automatically)
  - 750 free hours/month
  - Custom domain + HTTPS: included free

Demo logins after deploy:
  john.doe@kaala.io / Demo@123
  mike.m@kaala.io   / Demo@123
  alice.a@kaala.io  / Admin@123

EOF