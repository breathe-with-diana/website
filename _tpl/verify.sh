#!/usr/bin/env bash
# Rebuild the three pages from the template + content files and prove byte-identity
# against the pristine origin/main snapshots kept in _tpl/_orig/. Exit non-zero on any drift.
# Usage: bash _tpl/verify.sh   (run from anywhere)
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$DIR/.." && pwd)"

node "$DIR/build.js" --selftest
node "$DIR/build.js" --strict

fail=0
for f in index.html es.html ru.html; do
  if cmp -s "$ROOT/$f" "$DIR/_orig/$f"; then
    echo "OK   $f is byte-identical to origin/main snapshot"
  else
    echo "FAIL $f differs from origin/main snapshot"
    fail=1
  fi
done

# Guard: no em/en dashes (literal or entity) introduced anywhere in the output.
if grep -lP '\x{2014}|\x{2013}|&mdash;|&ndash;|&#8212;|&#8211;' "$ROOT/index.html" "$ROOT/es.html" "$ROOT/ru.html" 2>/dev/null; then
  echo "FAIL em/en dash found in output"
  fail=1
else
  echo "OK   no em/en dashes in output"
fi

exit $fail
