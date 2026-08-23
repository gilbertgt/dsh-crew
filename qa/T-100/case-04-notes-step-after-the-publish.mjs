// T-100 DoD item 2 (mutation ②): reading the notes AFTER `npm publish` is red.
//
// This is the defect interview answer 2 refuses, and it is the one that cannot
// be undone. A CHANGELOG with no section for this version has to stop the run
// while the version can still be stopped; once `npm publish` has run, that
// version is on npm for ever and the tag cannot be re-used to fix it.
//
// The pin locates "the publish" through the same `publishCommand` that decided
// this file is a publisher in the first place — T-100 DoD item 2 forbids a
// second answer to "what counts as publishing", because two definitions would
// let a release move out from under one pin while the other still called it
// green. This case therefore moves the step relative to the real publish step
// and never relative to a step number.

import { check, done, tempRepo, runCheck, cleanUp, expectRed, expectGreen, saidOk } from "../lib/qa.mjs";
import { moveStepAfter } from "./mutate.mjs";

const PUBLISH_YML = ".github/workflows/publish.yml";
const NOTES = "Read the release notes from CHANGELOG.md";
const AFTER = "AFTER `npm publish`";
const OK = "the GitHub release steps are in place in";

const dir = tempRepo();
try {
  expectGreen(runCheck(dir, "tools/verify-mount.mjs"), "the untouched copy is green (so the red below is the mutation)");
  moveStepAfter(dir, PUBLISH_YML, NOTES, "Publish");
  const run = runCheck(dir, "tools/verify-mount.mjs");
  expectRed(run, AFTER, "moving the notes step past `npm publish` is red");
  check("and the FAIL names the step and the file", run.out.includes(NOTES) && run.out.includes(PUBLISH_YML), run.out);
  check(
    "and the FAIL says why it cannot be undone (the version is already published)",
    run.out.split("\n").some((line) => line.startsWith("FAIL") && line.includes(AFTER) && /pulled back|for ever|already/i.test(line)),
    run.out,
  );
  check("and no `ok` line still claims the release steps are in place", !saidOk(run, OK), run.out);
} finally {
  cleanUp(dir);
}

// The mirror image: the step stays where it is and the PUBLISH moves up. The pin
// must red on the relationship, not on the notes step's line number.
const second = tempRepo();
try {
  moveStepAfter(second, PUBLISH_YML, "Publish", "Decide whether to publish");
  const run = runCheck(second, "tools/verify-mount.mjs");
  expectRed(run, AFTER, "moving the publish above the notes step is red too");
} finally {
  cleanUp(second);
}

done();
