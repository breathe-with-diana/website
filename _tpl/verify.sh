#!/usr/bin/env bash
# Guard for the site. Asserts three things and exits non-zero on any failure:
#   1. the engine self-tests pass;
#   2. every committed generated page is in sync with its template + content (i.e. nobody
#      edited a source file but forgot to rebuild, or committed a stale page);
#   3. no em/en dashes (literal or HTML entity) slipped into any page we ship.
# Wire this into a pre-push hook or CI. Run from anywhere inside the repo.
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$DIR/.." && pwd)"

node "$DIR/build.js" --selftest
node "$DIR/build.js" --strict

# Every file the build writes. Keep in step with BUNDLES in build.js.
# The three language pages are hand-maintained and deliberately absent.
GENERATED=(
  email/reset-en.html email/reset-es.html email/reset-ru.html
  email/review-en.html email/review-es.html email/review-ru.html
  breath-reset.html breath-reset-es.html breath-reset-ru.html
)

# A fresh strict build just rewrote all of them. If that changed any versus what is
# committed, the committed output was stale relative to its source.
if ! git -C "$ROOT" diff --quiet -- "${GENERATED[@]}"; then
  echo "FAIL committed output is stale: a fresh build changed a generated page."
  echo "     Run 'node _tpl/build.js --strict' and commit the regenerated pages."
  git -C "$ROOT" --no-pager diff --stat -- "${GENERATED[@]}"
  exit 1
fi
echo "OK   committed output matches a fresh build of template + content"

# Guard: no em/en dashes (literal or entity) in anything we ship, generated or not.
DASH_CHECKED=("${GENERATED[@]}" index.html es.html ru.html)
PATHS=()
for f in "${DASH_CHECKED[@]}"; do PATHS+=("$ROOT/$f"); done
if grep -lP '\x{2014}|\x{2013}|&mdash;|&ndash;|&#8212;|&#8211;' "${PATHS[@]}" 2>/dev/null; then
  echo "FAIL em/en dash found"
  exit 1
fi
echo "OK   no em/en dashes"

# The delivered emails must never carry the feedback widget; only the review copies do.
for f in email/reset-en.html email/reset-es.html email/reset-ru.html; do
  if grep -q 'feedback\.js' "$ROOT/$f"; then
    echo "FAIL $f carries the feedback widget; only email/review-*.html may"
    exit 1
  fi
done
for f in email/review-en.html email/review-es.html email/review-ru.html; do
  if ! grep -q 'feedback\.js' "$ROOT/$f"; then
    echo "FAIL $f is missing the feedback widget"
    exit 1
  fi
done
echo "OK   feedback widget only in the review copies"
