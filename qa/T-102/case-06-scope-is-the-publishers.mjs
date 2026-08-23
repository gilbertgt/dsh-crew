// T-102 DoD item 4: the permissions pin reads the workflows that PUBLISH, and
// only those.
//
// `.github/workflows/test.yml` is granted `contents: read`, and that is exactly
// right for it — it runs the suite and writes nothing. A pin let loose on the
// whole folder would red it, and a gate that reds correct files is a gate people
// stop reading (T-46).
//
// The other direction matters just as much and is the one that hides: a pin that
// read `publish.yml` by name would be green while a SECOND publishing workflow
// went out with `contents: read` and could never make a release. That is the
// hole T-43 found and T-44 closed one pin earlier in the same file.

import { check, done, tempRepo, runCheck, cleanUp, put, copyFile, expectRed, expectGreen, saidOk, failLines } from "../lib/qa.mjs";

const OK = "the release grants are in place in";
const WRONG = "grants `contents: read`, not `contents: write`";

// A publisher exactly like the real one in every way the other pins read —
// tag-only, full history, npm test before the publish — and granted `contents:
// read`, which cannot make a release page.
const publisher = (contents) => `name: Publish the other package

on:
  push:
    tags: ["v*"]

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: ${contents}
      id-token: write
    steps:
      - uses: actions/checkout@v7
        with:
          fetch-depth: 0
      - name: Run checks
        run: npm test
      - name: Read the release notes from CHANGELOG.md
        id: notes
        run: node -e "process.exit(0)"
      - name: Publish
        run: npm publish --provenance --access public
      - name: Create the GitHub release
        if: steps.guard.outputs.publish == 'true'
        run: gh release create "$GITHUB_REF_NAME"
`;

// Green: test.yml keeps `contents: read` and is correct that way. Said as a
// case and not left to the baseline, because this is the file a widened pin
// would break first.
const first = tempRepo();
try {
  const testYml = copyFile(first, ".github/workflows/test.yml");
  check(
    "test.yml really is granted `contents: read` (so the green below means something)",
    /^[ \t]*contents:[ \t]*read[ \t]*$/m.test(testYml),
    testYml,
  );
  check("and test.yml publishes nothing", !/npm publish/.test(testYml), testYml);
  const run = runCheck(first, "tools/verify-mount.mjs");
  expectGreen(run, "a workflow that publishes nothing keeps `contents: read` and stays green");
  check("and the pin still vouches for the one that does publish", saidOk(run, OK), run.out);
} finally {
  cleanUp(first);
}

// Green: a second publisher that IS correct. The pin reads every publisher, so
// adding one must not red the folder by itself.
const second = tempRepo();
try {
  put(second, ".github/workflows/publish-other.yml", publisher("write"));
  const run = runCheck(second, "tools/verify-mount.mjs");
  expectGreen(run, "a second, correct publisher stays green");
  check(
    "and the `ok` line now vouches for two publishers, by name",
    run.out.split("\n").some((line) => line.includes(OK) && line.includes("publish.yml") && line.includes("publish-other.yml")),
    run.out.split("\n").filter((line) => line.includes(OK)).join("\n"),
  );
} finally {
  cleanUp(second);
}

// Red: the second publisher with `contents: read`, and the FAIL has to name IT.
const third = tempRepo();
try {
  put(third, ".github/workflows/publish-other.yml", publisher("read"));
  const run = runCheck(third, "tools/verify-mount.mjs");
  expectRed(run, "publish-other.yml", "a second publisher granted `contents: read` is red");
  check("and the FAIL is about the grant", failLines(run).some((line) => line.includes(WRONG)), run.out);
  check(
    "and no FAIL blames publish.yml, which is untouched and correct",
    !failLines(run).some((line) => line.includes("publish.yml") && !line.includes("publish-other.yml")),
    failLines(run).join("\n"),
  );
  check("and the good publish.yml cannot vouch for the folder: the `ok` line is gone", !saidOk(run, OK), run.out);
} finally {
  cleanUp(third);
}

done();
