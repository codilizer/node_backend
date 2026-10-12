#!/bin/bash
# ------------------------------------------------------------
# AWS EC2 (Amazon Linux 2023 / Ubuntu) 초기 세팅 스크립트
#
#   ssh ec2-user@<host>
#   curl -fsSL <raw url>/scripts/ec2_setup.sh | bash
#   또는 저장소를 clone 한 뒤  bash scripts/ec2_setup.sh
#
# - nvm 으로 Node 22 설치
# - pm2 전역 설치
# - 저장소 clone (REPO_URL 수정 필요)  #need to specify
# - .env 생성 안내
#
# MongoDB / Redis 는 별도 관리형 서비스(Atlas, ElastiCache) 사용을 권장한다.
# ------------------------------------------------------------
set -euo pipefail

REPO_URL="#need to specify"          # 예) git@github.com:org/node_backend.git
APP_DIR="${APP_DIR:-$HOME/node_backend}"
NODE_VERSION="22"

echo "== install nvm & node ${NODE_VERSION}"
if [ ! -d "$HOME/.nvm" ]; then
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
fi
export NVM_DIR="$HOME/.nvm"
# shellcheck disable=SC1091
. "$NVM_DIR/nvm.sh"
nvm install "$NODE_VERSION"
nvm alias default "$NODE_VERSION"
node --version

echo "== install pm2"
npm install -g pm2

if [ "$REPO_URL" = "#need to specify" ]; then
  echo "REPO_URL 을 scripts/ec2_setup.sh 에서 지정한 뒤 다시 실행하거나, 수동으로 clone 해 주세요."
else
  if [ ! -d "$APP_DIR" ]; then
    echo "== clone repository"
    git clone "$REPO_URL" "$APP_DIR"
  fi
fi

if [ -d "$APP_DIR" ]; then
  cd "$APP_DIR"
  echo "== npm install"
  npm ci
  echo "== build admin client"
  npm run build:client
  if [ ! -f .env ]; then
    cp .env.example .env
    echo "!! .env 를 생성했습니다. 값을 채운 뒤 pm2 로 기동해 주세요: npm run pm2:start"
  fi
  mkdir -p logs temp/upload
fi

echo "== done"
echo "다음 단계:"
echo "  1) $APP_DIR/.env 에 MONGO_URI, SESSION_SECRET 등 '#need to specify' 값을 채운다"
echo "  2) npm run batch:admin-user -- --id=admin --password='...' --role=admin --dryRun=false"
echo "  3) npm run pm2:start && pm2 save && pm2 startup"
