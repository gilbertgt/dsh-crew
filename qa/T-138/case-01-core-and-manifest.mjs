// T-138 (Crew V2) — the core/manifest contract.
//
// Crew V2 splits the PM rules in two: `roles/pm.md` is the always-loaded core,
// and the numbered flow, the document ceremony, the decision records and the long
// rule lists moved into the on-demand playbooks under `roles/playbooks/`, whose
// manifest is `host/playbooks.js`. The whole point of the split is that dsh loads
// the CORE ALONE: a playbook that quietly rode along in the prompt would put the
// budget straight back where V2 found it, and nothing else in this repository
// would notice.
//
// What this case proves:
//   1. the core is at most `PM_CORE_MAX_BYTES` bytes;
//   2. every playbook the manifest names exists, is readable and is not empty;
//   3. `roles/playbooks/` holds no `.md` file the manifest does not name — an
//      orphan playbook is a file nobody reads and nobody checks;
//   4. `composePmRules()` is the core plus every playbook, in manifest order, so
//      "the rule still ships" keeps meaning something for a sentence that moved
//      out of the prompt;
//   5. the prompt section the host really registers carries the core and NOT one
//      byte of any playbook.
//
// Point 5 is the one that cannot be faked by reading the manifest: it mounts
// `host/crew.js` on a fake Cordis context and looks at the text that would be in
// front of the PM on every turn.

import { readdirSync } from "node:fs";
import { join } from "node:path";

import { check, done, mountCrew, REPO, pmCore } from "../lib/qa.mjs";
import {
  PLAYBOOKS,
  PLAYBOOKS_DIR,
  PM_CORE_MAX_BYTES,
  composePmRules,
  readPlaybook,
} from "../../host/playbooks.js";

// ---------------------------------------------- 1. the core is small enough

const core = pmCore();
const coreBytes = Buffer.byteLength(core, "utf8");
check(
  `roles/pm.md is at most ${PM_CORE_MAX_BYTES} bytes (it is ${coreBytes})`,
  coreBytes <= PM_CORE_MAX_BYTES,
  `the always-loaded core grew past the budget V2 set for it. A rule that has to be in front of the `
    + `PM every turn belongs here; a flow, a ceremony or a long rule list belongs in a playbook under `
    + `roles/playbooks/ and is read when the job needs it.`,
);

// ------------------------------------- 2 and 3. the manifest and its folder

check(
  "the manifest names at least one playbook",
  Array.isArray(PLAYBOOKS) && PLAYBOOKS.length > 0,
  `host/playbooks.js exports ${JSON.stringify(PLAYBOOKS)?.slice(0, 120)}`,
);

for (const playbook of PLAYBOOKS) {
  let text = "";
  try {
    text = readPlaybook(playbook.file);
  } catch (error) {
    check(`the playbook ${playbook.file} reads`, false, String(error?.message ?? error));
    continue;
  }
  check(
    `the playbook ${playbook.file} reads and is not empty`,
    text.length > 0,
    `host/playbooks.js names ${playbook.file} but it is empty or missing under ${PLAYBOOKS_DIR}`,
  );
  check(
    `the manifest says when to read ${playbook.file}`,
    typeof playbook.when === "string" && playbook.when.trim().length > 10,
    `a playbook with no "read it when" line is a file the PM cannot decide to open: ${JSON.stringify(playbook.when)}`,
  );
}

const onDisk = readdirSync(join(REPO, "roles", "playbooks"))
  .filter((name) => name.endsWith(".md"))
  .sort();
const named = PLAYBOOKS.map((playbook) => playbook.file).sort();
check(
  "roles/playbooks/ holds no .md file the manifest does not name",
  onDisk.every((name) => named.includes(name)),
  `not in the manifest: ${onDisk.filter((name) => !named.includes(name)).join(", ")} — a playbook nobody `
    + `is told to read is a file that only rots`,
);
check(
  "every playbook the manifest names is a real file in roles/playbooks/",
  named.every((name) => onDisk.includes(name)),
  `named but not on disk: ${named.filter((name) => !onDisk.includes(name)).join(", ")}`,
);

// ------------------------------- 4. the composed rules are the core plus them

const composed = composePmRules();
check(
  "composePmRules() starts with the core",
  composed.startsWith(core.trim()),
  `the composed text does not begin with roles/pm.md — a reader of "does this rule still ship" would be `
    + `judging something else`,
);
for (const playbook of PLAYBOOKS) {
  check(
    `composePmRules() carries ${playbook.file}`,
    composed.includes(readPlaybook(playbook.file)),
    `${playbook.file} is in the manifest but not in the composed rules`,
  );
}
check(
  "composePmRules() is longer than the core alone",
  composed.length > core.length,
  `composed ${composed.length} characters against a core of ${core.length}: the playbooks are not being `
    + `joined in, so every "the rule still ships" pin is silently judging the core only`,
);

// -------------------------------------- 5. the prompt really carries the core

const mounted = await mountCrew();
try {
  check(
    "the host registers a PM prompt at all",
    mounted.thrown === undefined && mounted.prompt.length > 0,
    `mounting host/crew.js threw: ${mounted.thrown?.message ?? "no prompt section was registered"}`,
  );
  check(
    "the registered prompt carries the core",
    mounted.prompt.trimStart().startsWith(core.trim()),
    `the prompt section does not start with roles/pm.md. This is the always-loaded half; if it is not the `
      + `core, V2 is not in force.`,
  );
  check(
    "no playbook reaches the always-loaded prompt",
    !mounted.prompt.includes("# Playbook:"),
    `a playbook is riding along in the prompt the PM carries on every turn`,
  );
  const budget = core.length + 8 * 1024;
  check(
    `the registered prompt stays within the core plus the language policy and the runtime facts (${mounted.prompt.length} vs ${budget})`,
    mounted.prompt.length <= budget,
    `the prompt is ${mounted.prompt.length} characters against a core of ${core.length}. The only text the `
      + `host appends is the language policy and the runtime facts, so a number this high means a playbook `
      + `is being loaded with the core.`,
  );
} finally {
  mounted.cleanUp();
}

done();
