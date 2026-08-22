// T-100 DoD item 5 (mutation ⑤): the release step must be gated on the same
// guard the publish is gated on.
//
// Why the gate exists (interview answer 3): `Decide whether to publish` asks npm
// whether this version is already there. If it is, `publish=false`, the publish
// is skipped, and the run stays green — which really happened at v0.7.0. An
// ungated release step would then run on its own on every re-push of the tag,
// and `gh release create` on a tag that already has a release fails the run.
//
// The condition is read as two substrings, not as one exact string, and that is
// deliberate: `${{ … }}` around it, extra spaces and a longer `&&` chain are all
// correct spellings of the same gate. Redding those would be redding a correct
// file, which teaches people to stop reading the check (T-46). So this case
// pins both sides — the wrong gates are red, and the other correct spellings
// stay green.

import { check, done, tempRepo, runCheck, cleanUp, edit, expectRed, expectGreen, saidOk } from "../lib/qa.mjs";

const PUBLISH_YML = ".github/workflows/publish.yml";
const RELEASE = "Create the GitHub release";
const GATE = "        if: steps.guard.outputs.publish == 'true'\n        env:";
const NO_IF = "has no `if:`, so re-pushing a tag whose version is already on npm";
const UNGATED = "is not gated on the publish guard";
const OK = "the GitHub release steps are in place in";

// The release step is the only one whose `if:` is followed by an `env:`, so this
// anchor picks it out without repeating the whole block.
const withGate = (replacement, assert) => {
  const dir = tempRepo();
  try {
    expectGreen(runCheck(dir, "tools/verify-mount.mjs"), "the untouched copy is green (so the red below is the mutation)");
    edit(dir, PUBLISH_YML, GATE, replacement);
    assert(runCheck(dir, "tools/verify-mount.mjs"));
  } finally {
    cleanUp(dir);
  }
};

// Red: no gate at all. Re-pushing a tag would skip the publish and still try to
// make a release.
withGate("        env:", (run) => {
  expectRed(run, NO_IF, "deleting the release step's `if:` is red");
  check("and the FAIL names the step and the file", run.out.includes(RELEASE) && run.out.includes(PUBLISH_YML), run.out);
  check("and no `ok` line still claims the release steps are in place", !saidOk(run, OK), run.out);
});

// Red: a gate that is not the publish guard. This is the shape that looks
// careful and is not — it runs on every tag push.
withGate("        if: github.ref_type == 'tag'\n        env:", (run) => {
  expectRed(run, UNGATED, "a condition that is not the publish guard is red");
  check("and the FAIL quotes the condition it read, so the fix is obvious", /if: github\.ref_type/.test(run.out), run.out);
});

// Red: the guard named but compared against something else.
withGate("        if: steps.guard.outputs.publish == 'yes'\n        env:", (run) => {
  expectRed(run, UNGATED, "the guard compared against 'yes' instead of 'true' is red");
});

// Green: the `${{ … }}` spelling of the same gate.
withGate("        if: ${{ steps.guard.outputs.publish == 'true' }}\n        env:", (run) => {
  expectGreen(run, "the `${{ … }}` spelling of the same gate stays green");
  check("and the `ok` line comes back", saidOk(run, OK), run.out);
});

// Green: a longer `&&` chain that still carries the guard. Tightening the gate
// is a correct change and must not be punished.
withGate("        if: steps.guard.outputs.publish == 'true' && github.ref_type == 'tag'\n        env:", (run) => {
  expectGreen(run, "an `&&` chain that still carries the guard stays green");
});

done();
