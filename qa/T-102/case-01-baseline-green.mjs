// T-102 DoD items 1–3, the premise the rest of this folder rests on: an
// untouched copy is green, and the permissions pin says out loud what it read.
//
// Never assert an exit code alone. A copy that cannot start the script exits
// non-zero too, and an exit-code-only case would read that as "the pin caught
// it" — the mistake qa/lib/qa.mjs records above `expectRed`.

import { check, done, tempRepo, runCheck, cleanUp, expectGreen, saidOk, okLines } from "../lib/qa.mjs";

const OK = "the release grants are in place in";
const dir = tempRepo();
try {
  const run = runCheck(dir, "tools/verify-mount.mjs");
  expectGreen(run, "an untouched copy of the repository is green");
  check(`the copy says: ok ${OK} …`, saidOk(run, OK), run.out);

  // T-102 DoD item 6: the message names the file it read.
  check(
    "and that `ok` line names the workflow it read",
    okLines(run).some((line) => line.includes(OK) && line.includes("publish.yml")),
    okLines(run).filter((line) => line.includes(OK)).join("\n"),
  );
  // It names both grants, and says why each one is there. A pin whose green line
  // does not say what it checked is a green nobody can act on.
  check(
    "and it names both grants",
    okLines(run).some((line) => line.includes(OK) && line.includes("contents: write") && line.includes("id-token: write")),
    okLines(run).filter((line) => line.includes(OK)).join("\n"),
  );
  // And it admits its limit: it reads the grant, not what the job does with it.
  check(
    "and it admits it does not read what the job does with either grant",
    okLines(run).some((line) => line.includes(OK) && /nothing here reads what the job does with either/.test(line)),
    okLines(run).filter((line) => line.includes(OK)).join("\n"),
  );
} finally {
  cleanUp(dir);
}

done();
