// T-101 DoD item 1, the step-4 half (M1 DoD item 1): the step that reads the
// release notes is named exactly what the contract fixed, carries `id: notes`,
// and has NO `if:` of its own.
//
// The name and the id are a contract, not a preference: section seven of
// docs/design/prd-2026-08-22-gh-release.md fixes both, and tools/verify-mount.mjs
// finds the step by that exact name. Rename it and the pin goes blind.
//
// The missing `if:` is the load-bearing half. An `if:` here is how a v* tag
// could go all the way through with no notes read at all — the release step
// after it would then have nothing to publish, or yesterday's words.

import { check, done, repoFile } from "../lib/qa.mjs";
import { publishSteps, stepNamed, keyIn, keyRaw } from "./steps.mjs";

const PUBLISH_YML = ".github/workflows/publish.yml";
const NOTES_STEP_NAME = "Read the release notes from CHANGELOG.md";

const steps = publishSteps(repoFile(PUBLISH_YML));
const notes = stepNamed(steps, NOTES_STEP_NAME);

check(
  `${PUBLISH_YML}: there is a step named exactly "${NOTES_STEP_NAME}"`,
  Boolean(notes),
  `step names found: ${steps.map((step) => step.label).join(" | ")}`,
);

if (notes) {
  check(
    `${PUBLISH_YML}: that step sets \`id: notes\``,
    keyIn(notes, "id") === "notes",
    `id is ${JSON.stringify(keyIn(notes, "id"))}`,
  );
  check(
    `${PUBLISH_YML}: that step has no \`if:\`, so it runs on every v* tag`,
    keyRaw(notes, "if") === null,
    `if is ${JSON.stringify(keyRaw(notes, "if"))}`,
  );
  // Exactly one step may answer to that name. Two would make "the step named X"
  // ambiguous, and the pin resolves it by taking the first — so a second copy
  // further down could sit after the publish and nothing would say so.
  check(
    `${PUBLISH_YML}: exactly one step answers to that name`,
    steps.filter((step) => step.kind === "name" && step.label === NOTES_STEP_NAME).length === 1,
    `found ${steps.filter((step) => step.kind === "name" && step.label === NOTES_STEP_NAME).length}`,
  );
}

done();
