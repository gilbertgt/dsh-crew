#!/usr/bin/env bash
# Runs every QA case of T-137. Exits 0 only when all of them pass.
#
# T-137 finishes the routing work before the merge: the `reviewRounds` runtime
# default and every example of it move to 2 (round one, then one re-check, and no
# third round), the PM's routing rule stops reading "takes user input" as a reason
# to open the full crew, and a `solo` route sits between `direct` and `crew` with a
# decision table a machine can read. These cases pin all three.
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

echo "T-137: $cases case(s), $((cases - failed)) passed, $failed failed"
[ "$failed" -eq 0 ]
