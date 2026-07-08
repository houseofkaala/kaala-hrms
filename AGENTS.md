# Agent rules — House of Kaala HRMS

## Data is sacred

When the user asks for UI, features, bug fixes, or deploys, **live HRMS data must never be deleted, reset, or overwritten**.

### Never do

- Delete or truncate `data/store.json`, `/var/lib/kaala-hrms/data/`, or PostgreSQL `hrms_store`
- Run `npm run clean` on production data paths (dist-only clean is fine)
- Set `ALLOW_DATA_MIGRATION=true` on production
- Set `DATA_PRESERVE=false` unless the user explicitly requests a full reset
- Re-seed, wipe, or "reset demo data" without explicit written consent
- Modify `server/clean-production-data.ts` to broaden what gets purged
- Change `syncSeedUsers` to overwrite existing user profiles/passwords in preserve mode
- Copy a dev `store.json` over production

### Always do

- Keep `DATA_PRESERVE=true` (default) in `.env` on VPS and production
- Run `./scripts/backup-data.sh` before any VPS deploy (`git pull` + restart)
- Use `./scripts/update-hostinger-vps.sh` on the server (includes automatic backup)
- Treat code changes as **additive**: new fields, new routes, new UI — not destructive migrations
- If a schema change is needed, merge new keys into existing records; do not clear arrays
- After deploy, verify data intact: employee count, projects, attendance logs still present

### Safe deploy flow (VPS)

```bash
cd /root/kaala-hrms
./scripts/update-hostinger-vps.sh
```

### Restore from backup (if ever needed)

```bash
cp /var/lib/kaala-hrms/backups/store-YYYYMMDD-HHMMSS.json /var/lib/kaala-hrms/data/store.json
sudo systemctl restart kaala-hrms
```

### Where data lives

| Environment | Location |
|-------------|----------|
| Hostinger VPS | `/var/lib/kaala-hrms/data/store.json` (symlinked as `data/`) |
| With `DATABASE_URL` | PostgreSQL table `hrms_store` |

Code deploys (`npm run build`, `git pull`) only replace `dist/` — they do **not** touch `data/` when these rules are followed.