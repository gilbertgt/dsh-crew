// T-102 DoD item 3 (mutation ③): losing `id-token: write` is red.
//
// This grant is easy to lose while editing the line above it, and losing it does
// not weaken the publish — it stops it. This repository stores no npm token:
// authentication is npm trusted publishing, an OIDC credential minted for that
// one run out of exactly this grant, checked against the publisher configured on
// npmjs.com. With it gone there is nothing to fall back on.
//
// It is pinned in the same breath as `contents: write` for that reason: the two
// live on adjacent lines, and the edit that widens one is the edit that deletes
// the other.

import { check, done, tempRepo, runCheck, cleanUp, expectRed, expectGreen, saidOk } from "../lib/qa.mjs";
import { replaceKeyBlock } from "./mutate.mjs";

const PUBLISH_YML = ".github/workflows/publish.yml";
// The mutations below rewrite the `id-token:` LINE, found by its key, and no
// anchor here quotes a word of prose. An `edit()` anchor covering the trailing
// `# required for OIDC …` comment would tie this case to the wording of that
// comment: reword it in publish.yml and the case dies on "anchor not found",
// which is a case failing on its own premise rather than on the thing it tests.
// qa/T-100/mutate.mjs states that rule at its top; this now follows it.
// `replaceKeyBlock` finds the key line-anchored, so the `id-token: write`
// written inside a comment further down the file is not a second match.
const ABSENT = "names no `id-token:` scope";
const OK = "the release grants are in place in";

const withIdToken = (lines, assert) => {
  const dir = tempRepo();
  try {
    expectGreen(runCheck(dir, "tools/verify-mount.mjs"), "the untouched copy is green (so the red below is the mutation)");
    replaceKeyBlock(dir, PUBLISH_YML, "id-token", lines);
    assert(runCheck(dir, "tools/verify-mount.mjs"));
  } finally {
    cleanUp(dir);
  }
};

// Red: the line deleted.
withIdToken([], (run) => {
  expectRed(run, ABSENT, "deleting `id-token: write` is red");
  check("and the FAIL names the file it read", run.out.includes(PUBLISH_YML), run.out);
  check(
    "and it says what breaks: trusted publishing has no secret to fall back on",
    run.out.split("\n").some((line) => line.startsWith("FAIL") && line.includes(ABSENT) && /no npm secret|trusted publishing/i.test(line)),
    run.out,
  );
  check("and no `ok` line still claims the grants are in place", !saidOk(run, OK), run.out);
});

// Red: downgraded rather than deleted. `id-token: read` mints nothing.
withIdToken(["      id-token: read"], (run) => {
  expectRed(run, "grants `id-token: read`, not `id-token: write`", "`id-token: read` is red");
});

// Green: the same grant with the comment gone. The pin reads the grant, not the
// prose beside it.
withIdToken(["      id-token: write"], (run) => {
  expectGreen(run, "the same grant without its trailing comment stays green");
  check("and the `ok` line comes back", saidOk(run, OK), run.out);
});

done();
