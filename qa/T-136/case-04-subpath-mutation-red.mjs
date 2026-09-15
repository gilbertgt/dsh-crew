// T-136 DoD item 3 — prove a temporary subpath Loader-row mutation causes a graph-enrollment failure.

import {
  check,
  copyFile,
  done,
  edit,
  expectGreen,
  expectRed,
  tempRepo,
  runCheck,
  cleanUp,
} from "../lib/qa.mjs";

const PATCH = "cordis.patch.yml";
const REGRESSION = "tools/verify-client-boot-graph.mjs";
const CORE_ROW = "    - id: dsh-crew-core\n      name: 'dsh-crew'";
const SUBPATH_ROW = "    - id: dsh-crew-core\n      name: 'dsh-crew/host/crew.js'";
const ENROLLMENT_FAILURE = "the composed boot graph is missing the dsh-crew client enrollment";

const dir = tempRepo();
try {
  const original = copyFile(dir, PATCH);
  check(
    "the temporary copy has exactly one bare dsh-crew core row to mutate",
    original.split(CORE_ROW).length - 1 === 1,
    original,
  );

  const baseline = runCheck(dir, REGRESSION);
  expectGreen(baseline, "the untouched temporary copy passes the boot-graph regression");

  edit(dir, PATCH, CORE_ROW, SUBPATH_ROW);
  const mutated = copyFile(dir, PATCH);
  check(
    "the mutation changes only the dsh-crew-core Loader row",
    mutated === original.replace(CORE_ROW, SUBPATH_ROW),
    mutated,
  );
  check(
    "the temporary copy really contains the reverted subpath row",
    mutated.includes(SUBPATH_ROW) && !mutated.includes(CORE_ROW),
    mutated,
  );

  const broken = runCheck(dir, REGRESSION);
  expectRed(
    broken,
    ENROLLMENT_FAILURE,
    "reverting dsh-crew-core to its subpath makes the boot-graph regression fail",
  );
  check(
    "the non-zero failure is specifically reported as missing graph enrollment",
    broken.out.split("\n").some(
      (line) => line.startsWith("FAIL") && line.includes(ENROLLMENT_FAILURE),
    ),
    broken.out,
  );
} finally {
  cleanUp(dir);
}

done();