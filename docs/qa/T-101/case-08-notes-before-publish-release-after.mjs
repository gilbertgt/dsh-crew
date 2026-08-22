// M1 DoD item 1, the ordering the interview's answer 2 bought: the notes are
// read BEFORE `npm publish`, and the release is created AFTER it.
//
// Both halves are one-way doors, and they fail in opposite directions.
//
// Notes after the publish: a CHANGELOG with no section for this version would be
// found only once the version was on npm — where it stays for ever. Nothing can
// pull it back.
//
// Release before the publish: a release page announcing a version the publish
// then failed to put on npm. People follow that page to a version that does not
// exist.
//
// "The publish" is located by the step that runs `npm publish`, never by a step
// number, so moving a step around cannot quietly make this case agree with the
// new order.

import { check, done, repoFile } from "../lib/qa.mjs";
import { publishSteps, stepNamed, publishStepOf } from "./steps.mjs";

const PUBLISH_YML = ".github/workflows/publish.yml";
const NOTES_STEP_NAME = "Read the release notes from CHANGELOG.md";
const RELEASE_STEP_NAME = "Create the GitHub release";

const steps = publishSteps(repoFile(PUBLISH_YML));
const publish = publishStepOf(steps);
const notes = stepNamed(steps, NOTES_STEP_NAME);
const release = stepNamed(steps, RELEASE_STEP_NAME);

check(`${PUBLISH_YML}: the notes step is there`, Boolean(notes), steps.map((step) => step.label).join(" | "));
check(`${PUBLISH_YML}: the release step is there`, Boolean(release), steps.map((step) => step.label).join(" | "));

if (notes) {
  check(
    `${PUBLISH_YML}: the notes are read BEFORE \`npm publish\` — a missing CHANGELOG section stops the run while the version can still be stopped`,
    notes.line < publish.line,
    `notes on line ${notes.line + 1}, \`npm publish\` on line ${publish.line + 1}`,
  );
}
if (release) {
  check(
    `${PUBLISH_YML}: the release is created AFTER \`npm publish\` — no release page for a version the publish failed to put on npm`,
    release.line > publish.line,
    `release on line ${release.line + 1}, \`npm publish\` on line ${publish.line + 1}`,
  );
}
if (notes && release) {
  check(
    `${PUBLISH_YML}: the notes file is written before the step that reads it`,
    notes.line < release.line,
    `notes on line ${notes.line + 1}, release on line ${release.line + 1}`,
  );
}

done();
