#!/usr/bin/env bash
# Build the game and publish it to GitHub Pages, keeping every earlier version.
#
#   bash scripts/deploy-pages.sh
#
# The gh-pages branch holds the newest build at its root, and every build ever published under
# versions/<commit>/ (listed at versions/). Each deploy is a new commit on top of gh-pages, never
# a force-push, so the branch's history keeps every version too. The source commit is tagged
# play-<commit>.
#
# Publishes to the git remote named "pages" if there is one (or PAGES_REPO), else "origin".
set -euo pipefail
if [ -n "${NODE:-}" ]; then :; elif [ -x "C:/Users/karee/.local/node-v24.11.1-win-x64/node.exe" ]; then NODE="C:/Users/karee/.local/node-v24.11.1-win-x64/node.exe"; else NODE=node; fi
REPO="${PAGES_REPO:-$(git remote get-url pages 2>/dev/null || git remote get-url origin)}"

"$NODE" node_modules/typescript/bin/tsc --noEmit
"$NODE" node_modules/vitest/vitest.mjs run --maxWorkers=1
rm -rf dist
"$NODE" node_modules/vite/bin/vite.js build --base ./

SHA="$(git rev-parse --short HEAD)"
WHEN="$(git log -1 --format=%cs HEAD)"
SUBJECT="$(git log -1 --format=%s HEAD | cut -c1-140)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

# Start from the published branch so nothing already there is lost.
if git ls-remote --exit-code "$REPO" gh-pages >/dev/null 2>&1; then
  git clone -q --branch gh-pages --single-branch "$REPO" "$WORK/site"
else
  git init -q "$WORK/site" && git -C "$WORK/site" checkout -q -b gh-pages
fi
cd "$WORK/site"

# A build published before versions/ existed is kept under its own commit.
if [ -f index.html ] && [ ! -d versions ]; then
  OLD="$(git log -1 --format=%s | sed -n 's/^Deploy \([0-9a-f]*\).*/\1/p')"
  OLD="${OLD:-previous}"
  mkdir -p "versions/$OLD"
  git mv -k index.html assets "versions/$OLD/" 2>/dev/null || true
  printf '%s\t%s\t%s\n' "$OLD" "$(git log -1 --format=%cs)" "Published before versions were kept" >> versions/list.tsv
fi

# The newest build at the root, and a copy under versions/<sha>.
find . -maxdepth 1 -mindepth 1 ! -name .git ! -name versions -exec rm -rf {} +
cp -r "$OLDPWD/dist/." .
mkdir -p "versions/$SHA"
rm -rf "versions/$SHA" && mkdir -p "versions/$SHA" && cp -r "$OLDPWD/dist/." "versions/$SHA/"
grep -v "^$SHA	" versions/list.tsv > versions/list.tmp 2>/dev/null || true
mv -f versions/list.tmp versions/list.tsv 2>/dev/null || true
printf '%s\t%s\t%s\n' "$SHA" "$WHEN" "$SUBJECT" >> versions/list.tsv
touch .nojekyll

# A page listing every version, newest first.
{
  echo '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
  echo '<title>The Golden Thread: versions</title>'
  echo '<style>body{font:16px/1.5 system-ui,sans-serif;margin:0;padding:32px 16px;background:#16142a;color:#f2eee6}main{max-width:760px;margin:auto}a{color:#f5c451}li{margin:8px 0}code{color:#bdb6e0}</style>'
  echo '<main><h1>The Golden Thread</h1><p><a href="../">Play the newest version</a></p><h2>Every version</h2><ul>'
  tac versions/list.tsv | while IFS=$'\t' read -r id day what; do
    echo "<li><a href=\"./$id/\">$day · <code>$id</code></a> — ${what//</&lt;}</li>"
  done
  echo '</ul></main>'
} > versions/index.html

git add -A
git -c user.name="$(git -C "$OLDPWD" config user.name || echo deploy)" -c user.email="$(git -C "$OLDPWD" config user.email || echo deploy@local)" commit -q -m "Deploy $SHA"
git push -q "$REPO" gh-pages
cd "$OLDPWD"
git tag -f "play-$SHA" >/dev/null && git push -q "$REPO" "refs/tags/play-$SHA" || true
echo "Published $SHA (and kept every earlier version under versions/)."
