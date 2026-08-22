// T-100 DoD item 1 (mutation ①): the pin goes red when the step that reads the
// release notes is not there — deleted, renamed, or commented out.
//
// What it costs when the pin misses this: a v* tag publishes to npm, the release
// step then has no `release-notes.md` to read, and the run goes red AFTER the
// version is on npm for ever. By interview answer 3 re-pushing the tag cannot
// repair it — the second run sees the version on npm, sets `publish=false`, and
// skips the release step with the publish.
//
// The name is matched exactly, and that is a contract, not a preference: section
// seven of docs/design/prd-2026-08-22-gh-release.md fixes it, and renaming the
// step means changing the pin in the same commit.

import { check, done, tempRepo, runCheck, cleanUp, edit, expectRed, expectGreen, saidOk } from "../lib/qa.mjs";
import { dropStep } from "./mutate.mjs";

const PUBLISH_YML = ".github/workflows/publish.yml";
const NOTES = "Read the release notes from CHANGELOG.md";
const MISSING = `publishes and has no step named "${NOTES}"`;
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

// Red: the whole step deleted.
withCopy((dir) => dropStep(dir, PUBLISH_YML, NOTES), (run) => {
  expectRed(run, MISSING, "deleting the notes step is red");
  check("and the FAIL names the file it read", run.out.includes(`${PUBLISH_YML} publishes and has no step`), run.out);
  check("and no `ok` line still claims the release steps are in place", !saidOk(run, OK), run.out);
});

// Red: renamed by one character. "Exactly this name" is the only handle a text
// pin has on "which step is this", so a near miss must not satisfy it.
withCopy((dir) => edit(dir, PUBLISH_YML, `- name: ${NOTES}`, "- name: Read the release notes from CHANGELOG.MD"), (run) => {
  expectRed(run, MISSING, "renaming the notes step by one character is red");
});

// Red: commented out. `#` is not whitespace, so a step that is only quoted in a
// comment satisfies nothing — the same line anchoring every workflow pin in
// tools/verify-mount.mjs uses.
withCopy((dir) => edit(dir, PUBLISH_YML, `      - name: ${NOTES}`, `      # - name: ${NOTES}`), (run) => {
  expectRed(run, MISSING, "commenting the notes step's name out is red");
});

done();
