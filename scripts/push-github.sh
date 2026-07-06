#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

GITHUB_USER="${1:-}"
REPO_NAME="${2:-kaala-hrms}"

if [ -z "$GITHUB_USER" ]; then
  echo "Usage: ./scripts/push-github.sh YOUR_GITHUB_USERNAME [repo-name]"
  echo ""
  echo "Example:"
  echo "  ./scripts/push-github.sh bymarketingonly kaala-hrms"
  exit 1
fi

if [ ! -d .git ]; then
  git init
  git branch -M main
fi

git add .
git status --short

if ! git diff --cached --quiet 2>/dev/null || [ -z "$(git log -1 2>/dev/null)" ]; then
  git commit -m "House of Kaala HRMS — Oracle Cloud deploy" || true
fi

REMOTE="https://github.com/${GITHUB_USER}/${REPO_NAME}.git"

if git remote get-url origin &>/dev/null; then
  git remote set-url origin "$REMOTE"
else
  git remote add origin "$REMOTE"
fi

cat <<EOF

Next steps:

1. Create repo on GitHub (if not exists):
   https://github.com/new
   Name: ${REPO_NAME}
   Visibility: Private recommended
   Do NOT add README/license (repo should be empty)

2. Push:
   git push -u origin main

3. On Oracle VM, clone and deploy:
   git clone ${REMOTE}
   cd ${REPO_NAME}
   DOMAIN=bymarketingonly.com ./scripts/oracle-vm-setup.sh

EOF