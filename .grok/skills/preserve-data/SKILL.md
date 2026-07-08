---
name: preserve-data
description: >
  Protect live HRMS data during any code change, deploy, or agent task for House of Kaala HRMS.
  Use on every prompt that touches kaala-hrms: features, UI, bugs, performance, deploys.
  Triggers: data safe, don't lose data, preserve employees, backup before deploy, production data.
---

# Preserve HRMS data

Read `AGENTS.md` in the repo root before making changes.

## Hard rules

1. `DATA_PRESERVE=true` must stay enabled on production/VPS.
2. Never wipe `data/store.json` or `/var/lib/kaala-hrms/data/`.
3. Never set `ALLOW_DATA_MIGRATION=true` on production.
4. Backup before every VPS deploy: `./scripts/backup-data.sh`
5. Deploy via `./scripts/update-hostinger-vps.sh` (backup is built in).

## Before deploy

```bash
./scripts/backup-data.sh
git pull && npm run build && sudo systemctl restart kaala-hrms
```

## After deploy

Confirm the service started and data is intact (user count, projects, attendance unchanged).

## If user asks for a full reset

Require explicit confirmation, backup first, then only then set `ALLOW_DATA_MIGRATION=true` for one restart.