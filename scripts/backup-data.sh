#!/usr/bin/env bash
# Snapshot HRMS data before deploys or risky changes. Safe to run anytime.
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DATA_FILE="${PROJECT_DIR}/data/store.json"
BACKUP_DIR="${BACKUP_DIR:-/var/lib/kaala-hrms/backups}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"

if [ ! -f "$DATA_FILE" ]; then
  echo "No data file at ${DATA_FILE} — nothing to back up."
  exit 0
fi

mkdir -p "$BACKUP_DIR"
DEST="${BACKUP_DIR}/store-${STAMP}.json"
cp -a "$DATA_FILE" "$DEST"

# Keep last 30 snapshots
ls -1t "${BACKUP_DIR}"/store-*.json 2>/dev/null | tail -n +31 | xargs -r rm -f

echo "Backed up to ${DEST} ($(wc -c < "$DEST") bytes)"