// T-42, DoD item 5c, the failure mode that has no message of its own in the
// rules but is the worst one: a green that read nothing. It looks exactly like a
// green that read everything.
//
// So the gate must go red when the file's shape moved out from under it, and red
// when the file is gone — never quietly pass over an empty set. This is the same
// mistake `fetch-depth: 1` would have caused in the push CI (T-22): checks that
// pass over nothing.

import { readdirSync } from "node:fs";
import { join } from "node:path";
import { check, done, tempRepo, runCheck, cleanUp, drop, editAll, expectRed, expectGreen, TASKS_MD } from "../lib/qa.mjs";

const NO_SECTIONS = "contains no `T-<number>.md` task file";
const MISSING = "docs/tasks/ is missing";

/** Every task file of a copy's `docs/tasks/` directory, sorted. */
const taskFiles = (dir) =>
  readdirSync(join(dir, TASKS_MD)).filter((name) => /^T-[A-Za-z0-9-]+\.md$/.test(name)).sort();

const dir = tempRepo();
try {
  const base = runCheck(dir, "tools/verify-tasks.mjs");
  expectGreen(base, "the untouched copy is green");
  check("and it says how many task sections it read", /ok\s+docs\/tasks\/: \d+ task sections read/.test(base.out), base.out);
} finally {
  cleanUp(dir);
}

// Red: every task file's top heading renamed, so the parser finds no section.
// Every Verdicts line is still in the files and still correct — nothing else
// changed — which is exactly the shape a silent green would come from.
const renamed = tempRepo();
try {
  const files = taskFiles(renamed);
  for (const file of files) editAll(renamed, `${TASKS_MD}/${file}`, "# T-", "# Task ");
  const run = runCheck(renamed, "tools/verify-tasks.mjs");
  expectRed(run, "the file's shape moved", `all ${files.length} task headings renamed is red, not a vacuous green`);
  check("and the message says the file's shape moved", run.out.includes("the file's shape moved"), run.out);
} finally {
  cleanUp(renamed);
}

// Red: the directory empty of task files. Nothing to read, and the check must
// say so.
const empty = tempRepo();
try {
  for (const file of taskFiles(empty)) drop(empty, `${TASKS_MD}/${file}`);
  expectRed(runCheck(empty, "tools/verify-tasks.mjs"), NO_SECTIONS, "an empty task table is red");
} finally {
  cleanUp(empty);
}

// Red: the directory gone. It must fail with its own message, not throw.
const gone = tempRepo();
try {
  drop(gone, TASKS_MD);
  const run = runCheck(gone, "tools/verify-tasks.mjs");
  expectRed(run, MISSING, "a missing task table is red");
  check("and it names the four reviews it can no longer record", run.out.includes("four reviews ran"), run.out);
  check("and it reports failure counts rather than crashing", /\d+ Verdicts check\(s\) failed/.test(run.out), run.out);
} finally {
  cleanUp(gone);
}
done();
