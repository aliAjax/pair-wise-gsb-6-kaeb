#!/usr/bin/env bash
# 编译纯逻辑模块并运行合并规则测试（不依赖浏览器 / DOM）
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf .tmp-pairstore
npx tsc --ignoreConfig src/lib/pairStore.ts --outDir .tmp-pairstore --module commonjs --target ES2020 --skipLibCheck
mv .tmp-pairstore/pairStore.js .tmp-pairstore/pairStore.cjs
node scripts/test-merge.cjs
rm -rf .tmp-pairstore
