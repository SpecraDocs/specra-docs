#!/bin/sh
set -e
cp -r /source/* /build/
npm install
npx prisma generate 2>/dev/null || true
npm run build
cp -r /build/build/* /output/
