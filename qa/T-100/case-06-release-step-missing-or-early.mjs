// T-100 DoD item 4 (mutation ④): the step that creates the GitHub release must
// be there, and must run AFTER `npm publish`.
//
// Missing is the whole defect this milestone exists to stop: 17 tags were pushed
// from this repository and not one of them left a release page behind, so npm
// had every version's notes and GitHub had a bare list of tags. A file that
// quietly lost this step would go back to exactly that, and every other check in
// the repository would stay green.
//
// Too early is the other direction, and it is the one that lies to people: a
// release page announcing a version that the publish then failed to put on npm.
// Anyone following that page reaches a version that does not exist.

import { check, done, tempRepo, runCheck, cleanUp, edit, expectRed, expectGreen, saidOk } from "../lib/qa.mjs";
import { dropStep, moveStepAfter } from "./mutate.mjs";

const PUBLISH_YML = ".github/workflows/publish.yml";
const RELEASE = "Create the GitHub release";
const MISSING = `publishes and has no step named "${RELEASE}"`;
const BEFORE = "BEFORE `npm publish`";
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

// Red: the step deleted — the repository back to 17 tags and 0 releases.
withCopy((dir) => dropStep(dir, PUBLISH_YML, RELEASE), (run) => {
  expectRed(run, MISSING, "deleting the release step is red");
  check("and the FAIL names the file it read", run.out.includes(`${PUBLISH_YML} publishes and has no step`), run.out);
  check("and no `ok` line still claims the release steps are in place", !saidOk(run, OK), run.out);
});

// Red: renamed by one character.
withCopy((dir) => edit(dir, PUBLISH_YML, `- name: ${RELEASE}`, "- name: Create the Github release"), (run) => {
  expectRed(run, MISSING, "renaming the release step by one character is red");
});

// Red: moved above the publish. The step is untouched otherwise — only where it
// sits changed.
withCopy((dir) => moveStepAfter(dir, PUBLISH_YML, RELEASE, "Run checks"), (run) => {
  expectRed(run, BEFORE, "moving the release step above `npm publish` is red");
  check(
    "and the FAIL says why: a release page for a version that was never published",
    run.out.split("\n").some((line) => line.startsWith("FAIL") && line.includes(BEFORE) && /failed to put on npm/.test(line)),
    run.out,
  );
});

done();
