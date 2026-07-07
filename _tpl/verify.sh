#!/usr/bin/env bash
# Guard for the template build system. Asserts three things and exits non-zero on any failure:
#   1. the engine self-tests pass;
#   2. the committed index.html / es.html / ru.html are in sync with the template + content
#      (i.e. nobody edited a source file but forgot to rebuild, or committed a stale page);
#   3. no em/en dashes (literal or HTML entity) slipped into the output.
# Wire this into a pre-push hook or CI. Run from anywhere inside the repo.
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$DIR/.." && pwd)"

node "$DIR/build.js" --selftest
node "$DIR/build.js" --strict

# A fresh strict build just wrote index.html/es.html/ru.html. If that changed any of them
# versus what is committed, the committed output was stale relative to its source.
if ! git -C "$ROOT" diff --quiet -- index.html es.html ru.html; then
  echo "FAIL committed output is stale: a fresh build changed index.html/es.html/ru.html."
  echo "     Run 'node _tpl/build.js --strict' and commit the regenerated pages."
  git -C "$ROOT" --no-pager diff --stat -- index.html es.html ru.html
  exit 1
fi
echo "OK   committed output matches a fresh build of template + content"

# Guard: no em/en dashes (literal or entity) anywhere in the output.
if grep -lP '\x{2014}|\x{2013}|&mdash;|&ndash;|&#8212;|&#8211;' "$ROOT/index.html" "$ROOT/es.html" "$ROOT/ru.html" 2>/dev/null; then
  echo "FAIL em/en dash found in output"
  exit 1
fi
echo "OK   no em/en dashes in output"
