// T-102 DoD item 8, the false-red half: every correct way of granting those two
// scopes must stay green.
//
// A pin that reds a file which publishes and releases perfectly well is worse
// than no pin: people learn to ignore it, and then it catches nothing. That is
// T-46's lesson, written into tools/verify-mount.mjs beside the
// continue-on-error pin and repeated in the risk table of
// docs/design/prd-2026-08-22-gh-release.md.
//
// So this case is the other side of case-02, -03 and -04. Every edit below is a
// legal spelling of the same grant, or a grant that covers it, and every one of
// them must pass in silence.

import { check, done, tempRepo, runCheck, cleanUp, expectGreen, saidOk, okLines } from "../lib/qa.mjs";
import { replaceKeyBlock } from "./mutate.mjs";

const PUBLISH_YML = ".github/workflows/publish.yml";
const OK = "the release grants are in place in";
// The `write-all` path returns before the scope-by-scope read, and says so in an
// `ok` line of its own (ADR 0025). Matched on the half that carries the meaning,
// not on the whole sentence, so rewording the rest of it does not red this case.
const WRITE_ALL_ADMISSION = "did NOT read the two scopes one by one";

const withPermissions = (what, lines, alsoCheck) => {
  const dir = tempRepo();
  try {
    expectGreen(runCheck(dir, "tools/verify-mount.mjs"), `${what}: the untouched copy is green`);
    replaceKeyBlock(dir, PUBLISH_YML, "permissions", lines);
    const run = runCheck(dir, "tools/verify-mount.mjs");
    expectGreen(run, `${what}: still green`);
    check(`${what}: the pin still vouches for the grants`, saidOk(run, OK), run.out);
    if (alsoCheck) alsoCheck(run, what);
  } finally {
    cleanUp(dir);
  }
};

// The plain block spelling, with the comments stripped off.
withPermissions("the bare block spelling", ["    permissions:", "      contents: write", "      id-token: write"]);

// YAML's flow mapping. The same two grants on one line.
withPermissions("the flow mapping on one line", ["    permissions: { contents: write, id-token: write }"]);

// Quoted keys and values. YAML reads `write` and `"write"` as one string.
withPermissions("quoted keys and values", ["    permissions:", '      "contents": "write"', "      'id-token': 'write'"]);

// The order swapped. Nothing depends on which comes first.
withPermissions("the two grants in the other order", ["    permissions:", "      id-token: write", "      contents: write"]);

// A third scope beside them. Whether a job is granted MORE than it needs is a
// security review's question, not this pin's — and redding it would red a file
// that releases perfectly well.
withPermissions("a third scope beside the two", ["    permissions:", "      contents: write", "      id-token: write", "      packages: read"]);

// The shorthand that grants every scope write access. It really does cover both,
// so it stays green — ADR 0025 decided that, and this case does not argue with
// it. But green here is bought differently from every case above it: the pin
// returns early and never reads `contents:` or `id-token:` at all, so its usual
// `ok` line would be vouching for two scopes it did not look at. It says so out
// loud in a second line, and THAT line is what keeps this from being a quiet
// false green. Nothing else in the repository pins it, so it is pinned here.
withPermissions("the `write-all` shorthand", ["    permissions: write-all"], (run, what) => {
  check(
    `${what}: the pin says out loud that it did NOT read the two scopes one by one`,
    okLines(run).some((line) => line.includes(WRITE_ALL_ADMISSION)),
    okLines(run).join("\n"),
  );
  check(
    `${what}: and that admission names the file it is about`,
    okLines(run).some((line) => line.includes(WRITE_ALL_ADMISSION) && line.includes("publish.yml")),
    okLines(run).filter((line) => line.includes(WRITE_ALL_ADMISSION)).join("\n"),
  );
});

done();
