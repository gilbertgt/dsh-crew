// T-100 DoD item 3 (mutation ③): an `if:` on the notes step is red.
//
// That step has no condition on purpose — it runs on every v* tag. An `if:` here
// is how a run goes green with no notes read at all: skip it on the wrong
// condition and the release step later either finds no `release-notes.md`, or
// finds a stale one left in the workspace and announces yesterday's words under
// today's version number.
//
// It is a tempting edit, too. `if: steps.guard.outputs.publish == 'true'` reads
// like tidiness — why read the notes when we are not publishing? — and it undoes
// interview answer 2 completely: a missing CHANGELOG section would then be found
// after the publish, or never.

import { check, done, tempRepo, runCheck, cleanUp, expectRed, expectGreen, saidOk } from "../lib/qa.mjs";
import { addToStep } from "./mutate.mjs";

const PUBLISH_YML = ".github/workflows/publish.yml";
const NOTES = "Read the release notes from CHANGELOG.md";
const HAS_IF = `puts an \`if:\` on the step named "${NOTES}"`;
const OK = "the GitHub release steps are in place in";

const withIf = (line, assert) => {
  const dir = tempRepo();
  try {
    expectGreen(runCheck(dir, "tools/verify-mount.mjs"), "the untouched copy is green (so the red below is the mutation)");
    addToStep(dir, PUBLISH_YML, NOTES, line);
    assert(runCheck(dir, "tools/verify-mount.mjs"));
  } finally {
    cleanUp(dir);
  }
};

// Red: the plausible one — the same gate the publish carries.
withIf("        if: steps.guard.outputs.publish == 'true'", (run) => {
  expectRed(run, HAS_IF, "gating the notes step on the publish guard is red");
  check("and the FAIL says the step has to run on every v* tag", /every v\* tag/.test(run.out), run.out);
  check("and no `ok` line still claims the release steps are in place", !saidOk(run, OK), run.out);
});

// Red: a condition that is almost always true is still a condition. The pin asks
// whether the step CAN be skipped, not whether it usually is.
withIf("        if: always()", (run) => expectRed(run, HAS_IF, "`if: always()` on the notes step is red"));

// Red: an `if:` written after the id, further down the step's body.
withIf("        if: github.event_name == 'push'", (run) => expectRed(run, HAS_IF, "any `if:` on the notes step is red"));

done();
