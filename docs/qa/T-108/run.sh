#!/usr/bin/env bash
# Runs every QA case of T-108. Exits 0 only when all of them pass.
#
# Finds its cases with a wildcard, so a new `case-*.mjs` in this folder is picked
# up without this file being edited. Files that are NOT named `case-*.mjs`
# (`contract.mjs`, `baseline.mjs`) are shared helpers and are never run on their own.
set -uo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cases=0
failed=0

for case_file in "$here"/case-*.mjs; do
  [ -e "$case_file" ] || continue
  cases=$((cases + 1))
  echo "--- $(basename "$case_file")"
  if ! node "$case_file"; then
    failed=$((failed + 1))
  fi
done

echo "T-108: $cases case(s), $((cases - failed)) passed, $failed failed"
[ "$failed" -eq 0 ]
