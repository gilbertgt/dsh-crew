// T-100 DoD item 8: the pin reads the workflows that PUBLISH, and only those.
//
// Both directions are load-bearing, and each one has cost real work here before.
//
// Too wide: a pin let loose on the whole folder would red `.github/workflows/
// test.yml`, which is completely correct without a release step. A gate that
// reds correct files gets ignored (T-46).
//
// Too narrow: a pin that read `publish.yml` by name would be green while a
// SECOND workflow published with no release step at all. That is the hole T-43
// reported and T-44 closed one pin earlier in the same file, and it is why this
// case adds a second publisher rather than trusting the folder to hold one.

import { check, done, tempRepo, runCheck, cleanUp, put, expectRed, expectGreen, saidOk, failLines } from "../lib/qa.mjs";

const OK = "the GitHub release steps are in place in";
const NOTES_MISSING = 'has no step named "Read the release notes from CHANGELOG.md"';
const RELEASE_MISSING = 'has no step named "Create the GitHub release"';

// A workflow that runs the suite and publishes nothing. It has no release step,
// no notes step and no `permissions:` block, and it is perfectly correct.
const NOT_A_PUBLISHER = `name: Lint

on:
  push:

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - run: node tools/verify-mount.mjs
`;

// A second workflow that really does publish, correct in every way the older
// pins read — tag-only, full history, npm test before the publish, both release
// grants — and missing exactly the two steps this pin is about.
const A_SECOND_PUBLISHER = `name: Publish the other package

on:
  push:
    tags: ["v*"]

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      id-token: write
    steps:
      - uses: actions/checkout@v7
        with:
          fetch-depth: 0
      - name: Run checks
        run: npm test
      - name: Publish
        run: npm publish --provenance --access public
`;

// Green: a non-publishing workflow is not this pin's business.
const first = tempRepo();
try {
  expectGreen(runCheck(first, "tools/verify-mount.mjs"), "the untouched copy is green");
  put(first, ".github/workflows/lint.yml", NOT_A_PUBLISHER);
  const run = runCheck(first, "tools/verify-mount.mjs");
  expectGreen(run, "a workflow that publishes nothing needs no release step");
  check("and the pin still vouches for the one that does publish", saidOk(run, OK), run.out);
} finally {
  cleanUp(first);
}

// Red: a second publisher with no release steps, and the FAIL has to name IT.
const second = tempRepo();
try {
  put(second, ".github/workflows/publish-other.yml", A_SECOND_PUBLISHER);
  const run = runCheck(second, "tools/verify-mount.mjs");
  expectRed(run, "publish-other.yml", "a second publisher with no release steps is red");
  check(
    "and the FAILs are about the two missing steps",
    failLines(run).some((line) => line.includes(NOTES_MISSING)) && failLines(run).some((line) => line.includes(RELEASE_MISSING)),
    run.out,
  );
  check(
    "and no FAIL blames publish.yml, which is untouched and correct",
    !failLines(run).some((line) => line.includes("publish.yml") && !line.includes("publish-other.yml")),
    failLines(run).join("\n"),
  );
  check(
    "and the good publish.yml cannot vouch for the folder: the `ok` line is gone",
    !saidOk(run, OK),
    run.out,
  );
} finally {
  cleanUp(second);
}

done();
