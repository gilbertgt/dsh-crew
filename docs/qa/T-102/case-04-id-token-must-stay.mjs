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

import { check, done, tempRepo, runCheck, cleanUp, edit, expectRed, expectGreen, saidOk } from "../lib/qa.mjs";

const PUBLISH_YML = ".github/workflows/publish.yml";
const ID_TOKEN = "      id-token: write # required for OIDC trusted publishing (and provenance)\n";
const ABSENT = "names no `id-token:` scope";
const OK = "the release grants are in place in";

const withPermissions = (to, assert) => {
  const dir = tempRepo();
  try {
    expectGreen(runCheck(dir, "tools/verify-mount.mjs"), "the untouched copy is green (so the red below is the mutation)");
    edit(dir, PUBLISH_YML, ID_TOKEN, to);
    assert(runCheck(dir, "tools/verify-mount.mjs"));
  } finally {
    cleanUp(dir);
  }
};

// Red: the line deleted.
withPermissions("", (run) => {
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
withPermissions("      id-token: read\n", (run) => {
  expectRed(run, "grants `id-token: read`, not `id-token: write`", "`id-token: read` is red");
});

// Green: the same grant with the comment gone. The pin reads the grant, not the
// prose beside it.
withPermissions("      id-token: write\n", (run) => {
  expectGreen(run, "the same grant without its trailing comment stays green");
  check("and the `ok` line comes back", saidOk(run, OK), run.out);
});

done();
