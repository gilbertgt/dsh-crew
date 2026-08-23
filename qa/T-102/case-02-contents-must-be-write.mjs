// T-102 DoD item 1 (mutation ①): `contents: read` on the publishing job is red.
//
// One word, and nothing else in the repository notices it. The file parses,
// every other pin stays green, `npm test` is green, and the mistake surfaces
// only when a v* tag is pushed: the package reaches npm, `gh release create` is
// refused for want of write access, and the run turns red AFTER the publish.
//
// And that state cannot be repaired the obvious way. By interview answer 3
// (section three of docs/design/prd-2026-08-22-gh-release.md) re-pushing the tag
// makes `Decide whether to publish` find the version already on npm, set
// `publish=false`, and skip the release step along with the publish. The only
// way back is a `gh release create` typed by hand. So the cost of this one word
// lands exactly on the hole this job already knows it has — which is why it is
// worth a pin, and a case, of its own.

import { check, done, tempRepo, runCheck, cleanUp, edit, expectRed, expectGreen, saidOk } from "../lib/qa.mjs";

const PUBLISH_YML = ".github/workflows/publish.yml";
const WRONG = "grants `contents: read`, not `contents: write`";
const ABSENT = "names no `contents:` scope";
const OK = "the release grants are in place in";

const withPermissions = (from, to, assert) => {
  const dir = tempRepo();
  try {
    expectGreen(runCheck(dir, "tools/verify-mount.mjs"), "the untouched copy is green (so the red below is the mutation)");
    edit(dir, PUBLISH_YML, from, to);
    assert(runCheck(dir, "tools/verify-mount.mjs"));
  } finally {
    cleanUp(dir);
  }
};

// Red: the one-word regression this pin exists for.
withPermissions("\n      contents: write\n", "\n      contents: read\n", (run) => {
  expectRed(run, WRONG, "`contents: read` on the publishing job is red");
  check("and the FAIL names the file it read", run.out.includes(PUBLISH_YML), run.out);
  check(
    "and it says what breaks, not just which word is wrong",
    run.out.split("\n").some((line) => line.startsWith("FAIL") && line.includes(WRONG) && /gh release create/.test(line)),
    run.out,
  );
  check("and no `ok` line still claims the grants are in place", !saidOk(run, OK), run.out);
});

// Red: `contents:` deleted rather than downgraded. A permissions block that
// lists scopes grants nothing it does not list, so leaving it out is the same
// outage written a different way — and it looks tidier in a diff.
withPermissions("\n      contents: write\n", "\n", (run) => {
  expectRed(run, ABSENT, "deleting the `contents:` scope is red");
  check(
    "and the FAIL says a listing block grants nothing it does not list",
    /grants nothing it does not list/.test(run.out),
    run.out,
  );
});

// Red: `contents: none`, the spelling somebody reaches for when tightening.
withPermissions("\n      contents: write\n", "\n      contents: none\n", (run) => {
  expectRed(run, "grants `contents: none`", "`contents: none` is red");
});

done();
