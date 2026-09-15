// T-136 DoD item 2: prove duplicate host rows, changed row ids, and active config mutations make the boot-graph contract check fail.

import {
  check,
  cleanUp,
  done,
  edit,
  expectGreen,
  expectRed,
  runCheck,
  tempRepo,
} from "../lib/qa.mjs";

const PATCH = "cordis.patch.yml";
const VERIFY = "tools/verify-client-boot-graph.mjs";

function baseline() {
  const dir = tempRepo();
  try {
    const run = runCheck(dir, VERIFY);
    expectGreen(run, "an untouched temporary copy is green before mutations");
  } finally {
    cleanUp(dir);
  }
}

function withMutation(label, mutate, assertFailure) {
  const dir = tempRepo();
  try {
    mutate(dir);
    const run = runCheck(dir, VERIFY);
    assertFailure(run, label);
  } finally {
    cleanUp(dir);
  }
}

baseline();

withMutation(
  "duplicating the core host row is rejected by the row-id uniqueness check",
  (dir) => {
    const row = "      name: 'dsh-crew'\n";
    edit(dir, PATCH, row, `${row}    - id: dsh-crew-core\n${row}`);
  },
  (run, label) => {
    expectRed(run, "host row ids are unique", label);
    check(
      "the duplicate mutation also names the single-core-mount contract",
      run.out.includes("dsh-crew core mount appears exactly once"),
      run.out,
    );
  },
);

withMutation(
  "changing the core row id is rejected by its id and name contract",
  (dir) => {
    edit(dir, PATCH, "    - id: dsh-crew-core", "    - id: dsh-crew-main");
  },
  (run, label) => {
    expectRed(run, "dsh-crew-core keeps its id and name contract", label);
  },
);

withMutation(
  "activating the core row config is rejected by its empty config contract",
  (dir) => {
    edit(
      dir,
      PATCH,
      "      name: 'dsh-crew'\n      # config:\n",
      "      name: 'dsh-crew'\n      config:\n",
    );
  },
  (run, label) => {
    expectRed(run, "dsh-crew-core keeps its empty config contract", label);
  },
);

done();


