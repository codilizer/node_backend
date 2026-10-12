#!/bin/bash
# ------------------------------------------------------------
# 서버에서 실행하는 배포 스크립트 (원본 deploy.sh 대체)
#
#   bash scripts/deploy.sh            # 현재 브랜치 pull 후 재시작
#   bash scripts/deploy.sh main       # 특정 브랜치
#
# CI(GitHub Actions 등)에서 ssh 로 이 스크립트를 호출하는 구성을 권장한다.
# ------------------------------------------------------------
set -euo pipefail

BRANCH="${1:-$(git rev-parse --abbrev-ref HEAD)}"
cd "$(dirname "$0")/.."

export NVM_DIR="$HOME/.nvm"
# shellcheck disable=SC1091
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

echo "== git pull origin $BRANCH"
git fetch origin
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

echo "== npm ci"
npm ci

echo "== typecheck"
npm run typecheck

echo "== build admin client"
npm run build:client

echo "== pm2 reload"
npm run pm2:reload

echo "== done: $(git rev-parse --short HEAD)"
