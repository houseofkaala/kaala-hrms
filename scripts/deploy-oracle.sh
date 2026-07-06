#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${DOMAIN:-bymarketingonly.com}"

cat <<'GUIDE'

================================================================
  House of Kaala HRMS — Oracle Cloud (FREE) + Hostinger DNS
  Live URL: https://bymarketingonly.com
================================================================

⚠ A1 OUT OF CAPACITY? (common in Mumbai)
  Run: ./scripts/oracle-capacity-workarounds.sh
  Quick live alternative: ./scripts/deploy-hostinger-render.sh

PART A — Push code to GitHub (on your Mac)
----------------------------------------
  cd /Users/bymarketingonly/Downloads/house-of-kaala-hrms
  ./scripts/push-github.sh YOUR_GITHUB_USERNAME kaala-hrms

  Then create empty repo at https://github.com/new and push:
  git push -u origin main


PART B — Create Oracle Cloud VM (free, always-on)
-------------------------------------------------
  1. Sign up: https://signup.oraclecloud.com
  2. Menu → Compute → Instances → Create instance

  Settings:
    Name:           kaala-hrms
    Image:          Ubuntu 22.04 (Canonical)
    Shape:          VM.Standard.A1.Flex  (Always Free — Ampere ARM)
    OCPUs:          4
    Memory:         24 GB
    Boot volume:    50 GB (up to 200 GB free)
    Public IP:      Assign a public IPv4 address ✓

  SSH keys:         Add your Mac public key
    cat ~/.ssh/id_ed25519.pub   (or id_rsa.pub)

  3. Networking → Security List → Add Ingress Rules:

    | Source    | Protocol | Port | Description |
    |-----------|----------|------|-------------|
    | 0.0.0.0/0 | TCP      | 22   | SSH         |
    | 0.0.0.0/0 | TCP      | 80   | HTTP        |
    | 0.0.0.0/0 | TCP      | 443  | HTTPS       |

  4. Create instance → copy the PUBLIC IP (e.g. 150.136.x.x)


PART C — Hostinger DNS (bymarketingonly.com)
--------------------------------------------
  1. Log in: https://hpanel.hostinger.com
  2. Domains → bymarketingonly.com → DNS / DNS Zone
  3. Add or edit these records:

    | Type  | Name | Value              | TTL  |
    |-------|------|--------------------|------|
    | A     | @    | YOUR_ORACLE_VM_IP  | 3600 |
    | CNAME | www  | bymarketingonly.com| 3600 |

  4. Remove conflicting A/CNAME records for @ or www if present
  5. Wait 10–30 minutes for DNS propagation


PART D — Deploy on Oracle VM (SSH into server)
----------------------------------------------
  ssh ubuntu@YOUR_ORACLE_VM_IP

  git clone https://github.com/YOUR_GITHUB_USERNAME/kaala-hrms.git
  cd kaala-hrms
  DOMAIN=bymarketingonly.com ./scripts/oracle-vm-setup.sh

  The script installs Docker, builds the app, and requests free SSL.


PART E — Verify
---------------
  https://bymarketingonly.com

  Demo logins:
    john.doe@kaala.io / Demo@123
    mike.m@kaala.io   / Demo@123
    alice.a@kaala.io  / Admin@123


TROUBLESHOOTING
---------------
  • SSL fails → DNS not propagated yet. Wait, then:
      DOMAIN=bymarketingonly.com ./scripts/init-ssl.sh

  • Site unreachable → check Oracle security list ports 80/443

  • Rebuild after code changes:
      git pull && docker compose up -d --build

GUIDE