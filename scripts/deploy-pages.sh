#!/usr/bin/env bash
# Build the game and publish it to GitHub Pages (the gh-pages branch of the repo in PAGES_REPO,
# or of the git remote named "pages"). Run from the repo root:  bash scripts/deploy-pages.sh
set -euo pipefail
NODE="${NODE:-C:/Users/karee/.local/node-v24.11.1-win-x64/node.exe}"
REPO="${PAGES_REPO:-$(git remote get-url pages 2>/dev/null || true)}"
if [ -z "$REPO" ]; then echo "Set PAGES_REPO or add a git remote named 'pages'." >&2; exit 1; fi

"$NODE" node_modules/typescript/bin/tsc --noEmit
"$NODE" node_modules/vitest/vitest.mjs run
rm -rf dist
"$NODE" node_modules/vite/bin/vite.js build --base ./
touch dist/.nojekyll

SHA="$(git rev-parse --short HEAD)"
cd dist
git init -q
git checkout -q -b gh-pages
git add -A
git -c user.name="$(git -C .. config user.name)" -c user.email="$(git -C .. config user.email)" commit -q -m "Deploy $SHA"
git push -f "$REPO" gh-pages
echo "Published $SHA."
