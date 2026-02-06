#!/bin/sh
set -e

echo "=== Specra Docs Builder ==="
echo "Installing dependencies..."

cp -r /source/* /build/
cd /build

npm install --production=false 2>&1
echo "Building..."
NEXT_BUILD_MODE=default npx next build 2>&1

echo "Copying standalone output..."
cp -r /build/.next/standalone/* /output/ 2>/dev/null || true
cp -r /build/.next /output/.next 2>/dev/null || true
cp -r /build/public /output/public 2>/dev/null || true

echo "=== Build complete ==="
