#!/bin/bash
# Deploy specra-docs to VPS (systemd + Bun)
# Usage: ./deploy.sh [--deps] [--schema]
#   --deps    Rebuild prod node_modules (when dependencies changed)
#   --schema  Run prisma db push on server (when schema changed)

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

SERVER="root@46.101.48.218"
REMOTE_DIR="/home/kamau/specra"
PROD_DEPS="/tmp/specra-prod-deps"

# Parse flags
REBUILD_DEPS=false
PUSH_SCHEMA=false
for arg in "$@"; do
  case $arg in
    --deps) REBUILD_DEPS=true ;;
    --schema) PUSH_SCHEMA=true ;;
  esac
done

echo "==> Building locally..."
npx prisma generate
STRIPE_SECRET_KEY="sk_test_placeholder" RESEND_API_KEY="re_placeholder" npm run build

if [ "$REBUILD_DEPS" = true ]; then
  echo "==> Rebuilding prod node_modules..."
  rm -rf "$PROD_DEPS"
  mkdir -p "$PROD_DEPS"
  cp package.json package-lock.json "$PROD_DEPS/"
  cd "$PROD_DEPS" && npm install --omit=dev
  cd "$SCRIPT_DIR"
fi

if [ ! -d "$PROD_DEPS/node_modules" ]; then
  echo "==> No prod node_modules found, building..."
  mkdir -p "$PROD_DEPS"
  cp package.json package-lock.json "$PROD_DEPS/"
  cd "$PROD_DEPS" && npm install --omit=dev
  cd "$SCRIPT_DIR"
fi

echo "==> Packaging tarball..."
tar -czf specra-deploy.tar.gz \
  build/ \
  static/ \
  docs/ \
  prisma/ \
  prisma.config.ts \
  scripts/ \
  server.ts \
  specra.config.json \
  src/lib/server/ \
  package.json \
  package-lock.json \
  --directory="$PROD_DEPS" node_modules/

echo "==> Uploading to server..."
scp specra-deploy.tar.gz "$SERVER:$REMOTE_DIR/"

REMOTE_CMD="cd $REMOTE_DIR && tar -xzf specra-deploy.tar.gz && rm specra-deploy.tar.gz && npx prisma generate"

if [ "$PUSH_SCHEMA" = true ]; then
  REMOTE_CMD="$REMOTE_CMD && npx prisma db push"
fi

REMOTE_CMD="$REMOTE_CMD && systemctl restart specra-docs"

echo "==> Deploying on server..."
ssh "$SERVER" "$REMOTE_CMD"

echo "==> Cleaning up local tarball..."
rm specra-deploy.tar.gz

echo "==> Verifying..."
sleep 3
STATUS=$(ssh "$SERVER" "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000")
if [ "$STATUS" = "200" ]; then
  echo "==> Deploy complete! Health check: $STATUS"
else
  echo "==> WARNING: Health check returned $STATUS"
  echo "    Check logs: ssh $SERVER 'journalctl -u specra-docs -n 30'"
  exit 1
fi
