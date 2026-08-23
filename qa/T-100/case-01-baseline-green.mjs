// T-100 DoD items 1–5, the premise every other case in this folder rests on: an
// untouched copy of this repository is green, and the pin says out loud that it
// looked at the release steps.
//
// Without this, every red below could be a copy that cannot even start — a
// missing file in the copy, a syntax error, a helper that threw — and an
// exit-code assertion would read that as "the pin caught it". qa/lib/qa.mjs
// carries the same warning above `expectRed`, from the time T-40 did exactly
// that and reported a pass on a case that died before the check ran.

import { check, done, tempRepo, runCheck, cleanUp, expectGreen, saidOk, okLines } from "../lib/qa.mjs";

const OK = "the GitHub release steps are in place in";
const dir = tempRepo();
try {
  const run = runCheck(dir, "tools/verify-mount.mjs");
  expectGreen(run, "an untouched copy of the repository is green");
  check(`the copy says: ok ${OK} …`, saidOk(run, OK), run.out);

  // The pin has to name the file it read. "A workflow is wrong" is not something
  // anyone can act on in a folder of them — the house rule every workflow pin in
  // tools/verify-mount.mjs follows, and T-100 DoD item 7.
  check(
    "and that `ok` line names the workflow it read",
    okLines(run).some((line) => line.includes(OK) && line.includes("publish.yml")),
    okLines(run).filter((line) => line.includes(OK)).join("\n"),
  );
  // It also has to say what it did NOT do, and say it in the one word that
  // matters: RUNS. A pin that claimed the release notes were correct would be
  // worse than no pin.
  //
  // The distinction is not word-play. This line used to read "the shell inside
  // those two steps is read by no check anywhere", and that was false — and
  // false in the dangerous direction. qa/T-101/case-07 reads that shell's
  // text, so somebody trusting the old sentence would think they could edit the
  // awk program freely and nothing would answer, when in fact `npm test` goes
  // red. What is true is narrower and more useful: nothing EXECUTES it. The
  // last real test of that code is still the first v* tag pushed after it
  // landed (interview answer 6, qa/gaps.md item 54).
  //
  // The wording is fixed by T-105's DoD item 5 in docs/design/tasks.md, which
  // owns tools/verify-mount.mjs. Two short substrings are pinned rather than the
  // whole sentence: the verb that carries the distinction, and the half that
  // says reading is not executing.
  check(
    "and it admits nothing RUNS the shell inside those steps",
    okLines(run).some((line) => line.includes(OK) && line.includes("runs the shell inside those two steps")),
    okLines(run).filter((line) => line.includes(OK)).join("\n"),
  );
  check(
    "and it points at the case that does read that shell's text, so 'unread' cannot be inferred",
    okLines(run).some((line) => line.includes(OK) && line.includes("nothing executes it")),
    okLines(run).filter((line) => line.includes(OK)).join("\n"),
  );
} finally {
  cleanUp(dir);
}

done();
