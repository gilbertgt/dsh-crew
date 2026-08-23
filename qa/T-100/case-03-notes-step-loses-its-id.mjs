// T-100 DoD item 1, the second half: the notes step must set `id: notes`.
//
// The id is the other half of the contract in section seven of the PRD.
//
// Say plainly what it is NOT. Nothing in publish.yml reads `steps.notes` today —
// the release step takes the words from the file `release-notes.md`, not from a
// step output — so losing the id would break nothing on the next tag. This pin
// is the only thing keeping it there, and it is kept because the contract says
// so: the id is the handle anything else in that job would have to use to reach
// this step (an output, a condition, a second reader), and a step with the right
// name and no id is a step nothing can refer to.
//
// The earlier version of this comment claimed the step after it already read
// `steps.notes`. Nothing ever did. tools/verify-mount.mjs carried the same false
// sentence and T-103 corrected it there; this is the same correction, so the two
// files say one thing.

import { check, done, tempRepo, runCheck, cleanUp, edit, expectRed, expectGreen, saidOk } from "../lib/qa.mjs";

const PUBLISH_YML = ".github/workflows/publish.yml";
const NOTES = "Read the release notes from CHANGELOG.md";
const NO_ID = "does not set `id: notes`";
const OK = "the GitHub release steps are in place in";

const withCopy = (breakIt, assert) => {
  const dir = tempRepo();
  try {
    expectGreen(runCheck(dir, "tools/verify-mount.mjs"), "the untouched copy is green (so the red below is the mutation)");
    breakIt(dir);
    assert(runCheck(dir, "tools/verify-mount.mjs"));
  } finally {
    cleanUp(dir);
  }
};

// Red: the id line deleted.
withCopy((dir) => edit(dir, PUBLISH_YML, "\n        id: notes\n", "\n"), (run) => {
  expectRed(run, NO_ID, "deleting `id: notes` is red");
  check("and the FAIL names the step it is about", run.out.includes(NOTES), run.out);
  check("and no `ok` line still claims the release steps are in place", !saidOk(run, OK), run.out);
});

// Red: an id that is not the one the contract fixed. `steps.notes` is the handle
// the rest of the job would have to use, so a different id breaks the contract
// the same way deleting it does.
withCopy((dir) => edit(dir, PUBLISH_YML, "        id: notes\n", "        id: changelog\n"), (run) => {
  expectRed(run, NO_ID, "a different id is red");
});

// Green: the same id written as a quoted scalar. YAML reads `notes`, `"notes"`
// and `'notes'` as one string, and redding a correctly quoted file would be
// redding a correct file — the T-46 lesson this pin's own comment cites.
withCopy((dir) => edit(dir, PUBLISH_YML, "        id: notes\n", '        id: "notes"\n'), (run) => {
  expectGreen(run, "a quoted `id: \"notes\"` stays green");
});

done();
