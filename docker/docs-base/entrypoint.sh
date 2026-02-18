#!/bin/sh
cp -r /data/build/* /app/ 2>/dev/null || true
cp -r /data/static /app/static 2>/dev/null || true
node /app/index.js
