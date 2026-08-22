// T-102 DoD item 2 (mutation ②): no `permissions:` block at all is red.
//
// Not "probably fine". When a workflow says nothing, the run gets whatever the
// repository's default happens to be that day — a setting in the GitHub UI that
// nobody in this repository can see, that no file records, and that an
// organisation-wide policy can change without a commit. `id-token: write` is
// never in a default, so trusted publishing would stop; and the default for
// `contents` may be read, so the release would stop too.
//
// The fix is to say it in the file, which is what this pin asks for.

import { check, done, tempRepo, runCheck, cleanUp, expectRed, expectGreen, saidOk } from "../lib/qa.mjs";
import { dropKeyBlock, replaceKeyBlock } from "./mutate.mjs";

const PUBLISH_YML = ".github/workflows/publish.yml";
const NONE = "sets no `permissions:` at all";
const OK = "the release grants are in place in";

const dir = tempRepo();
try {
  expectGreen(runCheck(dir, "tools/verify-mount.mjs"), "the untouched copy is green (so the red below is the mutation)");
  dropKeyBlock(dir, PUBLISH_YML, "permissions");
  const run = runCheck(dir, "tools/verify-mount.mjs");
  expectRed(run, NONE, "a publishing job with no `permissions:` block is red");
  check("and the FAIL names the file it read", run.out.includes(PUBLISH_YML), run.out);
  check(
    "and it says why silence is not safe: the repository default decides instead",
    /whatever the repository's default happens to be/.test(run.out),
    run.out,
  );
  check(
    "and it says what to write instead, both scopes",
    run.out.split("\n").some((line) => line.startsWith("FAIL") && line.includes("contents: write") && line.includes("id-token: write")),
    run.out,
  );
  check("and no `ok` line still claims the grants are in place", !saidOk(run, OK), run.out);
} finally {
  cleanUp(dir);
}

// The other spelling of the same silence: `permissions:` written with nothing
// under it. YAML reads that as an empty mapping, which grants no scope at all —
// so it must be red for a named-scope reason, not green because the key exists.
const second = tempRepo();
try {
  replaceKeyBlock(second, PUBLISH_YML, "permissions", ["    permissions:"]);
  const run = runCheck(second, "tools/verify-mount.mjs");
  expectRed(run, "names no `contents:` scope", "an empty `permissions:` block is red on contents");
  expectRed(run, "names no `id-token:` scope", "and red on id-token too");
  check("and no `ok` line still claims the grants are in place", !saidOk(run, OK), run.out);
} finally {
  cleanUp(second);
}

done();
