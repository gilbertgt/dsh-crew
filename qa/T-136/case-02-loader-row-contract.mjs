// T-136 DoD item 2: prove the parsed active host-row contract and its mutation guards.
// The real boot-graph verifier must stay green for the correct tree and red when
// a temporary copy changes a row name, row id, config, or active-row count.

import {
  check,
  cleanUp,
  copyFile,
  done,
  edit,
  expectGreen,
  expectRed,
  failLines,
  runCheck,
  tempRepo,
} from "../lib/qa.mjs";

const VERIFY = "tools/verify-client-boot-graph.mjs";
const PATCH = "cordis.patch.yml";

const expectedOkLines = [
  "cordis.patch.yml has exactly three active host rows",
  "dsh-crew-core keeps its id and name contract",
  "dsh-crew-core keeps its empty config contract",
  "dsh-crew-git-guard keeps its id and name contract",
  "dsh-crew-git-guard keeps its empty config contract",
  "dsh-crew-pm-write-guard keeps its id and name contract",
  "dsh-crew-pm-write-guard keeps its empty config contract",
  "the dsh-crew core mount appears exactly once",
];

function showMutationFailure(label, run) {
  const lines = failLines(run);
  console.log(`observed ${label} failure (exit ${run.status}):`);
  console.log(lines.length > 0 ? lines.join("\n") : run.out.trim());
}

function runMutation(label, mutate, failureNeedle) {
  const dir = tempRepo();
  try {
    mutate(dir);
    const run = runCheck(dir, VERIFY);
    showMutationFailure(label, run);
    expectRed(run, failureNeedle, `${label} mutation makes the real verifier red`);
  } finally {
    cleanUp(dir);
  }
}

// Positive path: every assertion below comes from the verifier's parsed row
// results, not from searching cordis.patch.yml in this case.
const baseDir = tempRepo();
try {
  const base = runCheck(baseDir, VERIFY);
  expectGreen(base, "the correct temporary copy passes the boot-graph verifier");
  for (const line of expectedOkLines) {
    check(`correct tree reports: ok ${line}`, base.out.split("\n").includes(`ok    ${line}`), base.out);
  }
} finally {
  cleanUp(baseDir);
}

// Minimal row-name mutation: the core row is no longer a bare package row.
runMutation(
  "core row name",
  (dir) => edit(dir, PATCH, "      name: 'dsh-crew'\n", "      name: 'dsh-crew/host/crew.js'\n"),
  "dsh-crew-core keeps its id and name contract",
);

// Minimal row-id mutation: only the core id changes; all other row fields stay.
runMutation(
  "core row id",
  (dir) => edit(dir, PATCH, "    - id: dsh-crew-core\n", "    - id: dsh-crew-core-renamed\n"),
  "dsh-crew-core keeps its id and name contract",
);

// Minimal config mutation: an active config value makes the empty-config contract
// false while leaving the row name and id untouched.
runMutation(
  "core row config",
  (dir) => edit(dir, PATCH, "      name: 'dsh-crew'\n", "      name: 'dsh-crew'\n      config: {}\n"),
  "dsh-crew-core keeps its empty config contract",
);

// Minimal active-row-count mutation: add one distinct active row, rather than
// changing comments or relying on a substring that the parser would ignore.
runMutation(
  "active row count",
  (dir) => edit(
    dir,
    PATCH,
    "      name: 'dsh-crew/host/pm-write-guard.js'\n",
    "      name: 'dsh-crew/host/pm-write-guard.js'\n\n    - id: dsh-crew-extra\n      name: 'dsh-crew'\n",
  ),
  "cordis.patch.yml has exactly three active host rows",
);

// Keep this source-level self-check narrow: the mutation anchors above must be
// present exactly once in the real patch shape, otherwise a mutation could be a
// false green caused by editing nothing.
const anchorDir = tempRepo();
try {
  const patch = copyFile(anchorDir, PATCH);
  check("core row name anchor appears once", patch.split("      name: 'dsh-crew'\n").length - 1 === 1, patch);
  check("core row id anchor appears once", patch.split("    - id: dsh-crew-core\n").length - 1 === 1, patch);
  check("core guard row anchor appears once", patch.split("      name: 'dsh-crew/host/pm-write-guard.js'\n").length - 1 === 1, patch);
} finally {
  cleanUp(anchorDir);
}

done();
