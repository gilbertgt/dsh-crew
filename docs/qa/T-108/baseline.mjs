// Shared helper for the T-108 cases. This file is NOT a case: the runners only
// execute files named `case-*.mjs`.
//
// WHY A FIXED COMMIT. Four DoD items of the `skip-and-split` job are of the shape
// "the old rule is unchanged" / "nothing was added". A check of that shape needs
// a BEFORE, and `HEAD` is not one: the moment the work is committed, `HEAD` holds
// the new file and the case compares it with itself and passes for ever. That is
// shape 4 of `docs/decisions/adr/0023-a-check-can-be-dead-when-written.md` — a
// check that was dead the day it was written. So the before is the job's START
// COMMIT, named in `docs/design/prd-2026-08-22-skip-and-split.md`, and it stays
// readable for as long as this history does.
//
// It CAN fail for a reason that is not a defect: a rewritten history, or a
// shallow clone with no such object. When it does, the case goes RED and says so
// — never a silent skip. `.github/workflows/test.yml` checks out with
// `fetch-depth: 0` for exactly this family of cases.

import { spawnSync } from "node:child_process";
import { REPO } from "../lib/qa.mjs";

/** The commit this job started from — `docs/design/prd-2026-08-22-skip-and-split.md`, "起始提交". */
export const START_COMMIT = "c5eac75";

/**
 * One repository file as it stood at the start commit.
 * @returns `{ ok: true, text }` or `{ ok: false, why }` — never throws, so the
 * case can report the reason as a red rather than dying on a stack trace.
 */
export function before(relative) {
  const run = spawnSync("git", ["show", `${START_COMMIT}:${relative}`], { cwd: REPO, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  if (run.error) return { ok: false, why: `git could not be run: ${run.error.message}` };
  if (run.status !== 0) {
    return {
      ok: false,
      why: `git show ${START_COMMIT}:${relative} exited ${run.status} — ${(run.stderr || "").trim()}`
        + " (a rewritten history or a shallow clone; this case has no BEFORE to compare against, so it has not run)",
    };
  }
  return { ok: true, text: run.stdout };
}

/** Every `##`/`###` heading line of a file, in order. */
export const headingLines = (text) => text.split("\n").filter((line) => /^#{2,3} /.test(line));
