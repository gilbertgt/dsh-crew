#!/usr/bin/env bash
# Runs every QA case of T-138. Exits 0 only when all of them pass.
set -uo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cases=0
failed=0

for case_file in "$here"/case-*.mjs; do
  [ -e "$case_file" ] || [ -L "$case_file" ] || continue
  cases=$((cases + 1))
  echo "--- $(basename "$case_file")"
  if [ ! -f "$case_file" ] || [ -L "$case_file" ]; then
    echo "FAIL  $(basename "$case_file"): case file must be a regular non-symlink file"
    failed=$((failed + 1))
    continue
  fi
  if ! node "$case_file"; then
    failed=$((failed + 1))
  fi
done

if [ "$cases" -eq 0 ]; then
  echo "FAIL  T-138: no case files found"
  echo "T-138: 0 case(s), 0 passed, 1 failed"
  exit 1
fi

echo "T-138: $cases case(s), $((cases - failed)) passed, $failed failed"
[ "$failed" -eq 0 ]
