// T-100 DoD item 1, the second half: the notes step must set `id: notes`.
//
// The id is half the contract in section seven of the PRD. A step with the right
// name and no id is a step nothing else in the job can refer to: `steps.notes`
// resolves to nothing, and anything that later wants the notes — an output, a
// condition, a second reader — silently gets an empty value instead of an error.
// The file would look right in a diff.

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

// Red: an id that is not the one the contract fixed. `steps.notes` is the name
// the rest of the job would have to use, so a different id is the same outage.
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
