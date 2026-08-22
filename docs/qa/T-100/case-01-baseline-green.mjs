// T-100 DoD items 1–5, the premise every other case in this folder rests on: an
// untouched copy of this repository is green, and the pin says out loud that it
// looked at the release steps.
//
// Without this, every red below could be a copy that cannot even start — a
// missing file in the copy, a syntax error, a helper that threw — and an
// exit-code assertion would read that as "the pin caught it". docs/qa/lib/qa.mjs
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
  // It also has to say what it did NOT read. A pin that claimed the release
  // notes were correct would be worse than no pin: the shell inside those two
  // steps is executed by nothing, anywhere.
  check(
    "and it admits the shell inside those steps is read by no check",
    okLines(run).some((line) => line.includes(OK) && /shell inside those two steps is read by no check/.test(line)),
    okLines(run).filter((line) => line.includes(OK)).join("\n"),
  );
} finally {
  cleanUp(dir);
}

done();
