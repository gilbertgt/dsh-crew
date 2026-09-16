// T-138 (Crew V2) — the three consistency rules this migration round settled.
//
// Each of them is a place where two files can drift apart while both look right
// on their own, so nothing but a check that reads BOTH can catch it:
//
//   1. the PM's playbook index (`roles/pm.md`) must give every playbook the same
//      "read it when" condition as the manifest (`host/playbooks.js`) — the index
//      is what the PM reads, the manifest is what the tool offers, and a route
//      condition that differs between them is how a `solo` job gets sent to a
//      crew-only file;
//   2. `crew-routing.md` may not bind `solo` to a task row, a DoD row, step 9 or
//      the crew flow: that route has none of them, and its briefing is the
//      TaskBrief;
//   3. `jobsNotice()` must never read a state file that says `solo` as unfinished
//      crew work — not when its task list is empty, and not when it holds open
//      tasks somebody wrote by hand.
//
// The three are one case because they are one contract: V2 says a `solo` job is a
// TaskBrief, one engineer and at most one named reviewer, with no crew documents
// and no ledger.

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { check, cleanUp, done, flat, pmCore, tempDir } from "../lib/qa.mjs";
import { PLAYBOOKS, readPlaybook } from "../../host/playbooks.js";
import { jobsNotice } from "../../host/jobs.js";

// ------------------------------------------- 1. the index and the manifest agree

const core = pmCore();
const indexStart = core.indexOf("## Playbooks: read only what this job needs");
if (indexStart < 0) throw new Error("roles/pm.md has no playbook index — the section moved");
const indexEnd = core.indexOf("\n## ", indexStart + 4);
const index = indexEnd === -1 ? core.slice(indexStart) : core.slice(indexStart, indexEnd);
const rows = [...index.matchAll(/^\|\s*`([a-z-]+)`\s*\|\s*(.+?)\s*\|\s*$/gm)]
  .map((hit) => ({ name: hit[1], when: hit[2] }));

check(
  `the index lists every playbook the manifest names (${rows.length} row(s))`,
  rows.length === PLAYBOOKS.length,
  `index: ${rows.map((row) => row.name).join(", ")} | manifest: ${PLAYBOOKS.map((p) => p.file).join(", ")}`,
);

for (const playbook of PLAYBOOKS) {
  const name = playbook.file.replace(/\.md$/, "");
  const row = rows.find((entry) => entry.name === name);
  check(
    `the index names ${name}`,
    row !== undefined,
    `the manifest ships ${name} and the index does not offer it`,
  );
  check(
    `the index's condition for ${name} is the manifest's, word for word`,
    row !== undefined && row.when === playbook.when,
    `index: ${JSON.stringify(row?.when)}\n      manifest: ${JSON.stringify(playbook.when)}`,
  );
}
for (const row of rows) {
  check(
    `the index's ${row.name} is a playbook the manifest ships`,
    PLAYBOOKS.some((playbook) => playbook.file === `${row.name}.md`),
    `the index offers ${row.name}, which \`crew_playbook\` would refuse`,
  );
}

// ------------------------------- 2. crew-routing does not bind solo to crew work

const routing = flat(readPlaybook("crew-routing.md"));
const SOLO_CREW_WORDS = ["task row", "DoD", "step 9", "crew-flow", "opening document"];
const sentences = routing.split(/(?<=[.!?])\s+/);
const strays = sentences.filter((sentence) => /`solo`|solo job|\bsolo\b/.test(sentence)
  && SOLO_CREW_WORDS.some((word) => sentence.includes(word))
  && !/\bno\b|\bnot\b|\bnever\b|\bnone\b|\bnothing\b/i.test(sentence));

check(
  "crew-routing.md never binds `solo` to a crew document or to step 9",
  strays.length === 0,
  `these sentences send a solo job after crew work: ${JSON.stringify(strays)}`,
);
check(
  "crew-routing.md still tells a solo job what it does work from",
  /TaskBrief/.test(routing),
  "the routing playbook no longer names the TaskBrief, so a solo job has no briefing described there",
);
check(
  "crew-routing.md still names the crew flow, so the exclusion is readable",
  /crew/.test(routing),
  "the playbook no longer mentions the crew route at all",
);

// ----------------------------- 3. a `solo` state file is never unfinished crew work

const dir = tempDir("crew-qa-solo-state-");
try {
  const write = (slug, state) => {
    const job = join(dir, slug);
    mkdirSync(job, { recursive: true });
    writeFileSync(join(job, "state.json"), JSON.stringify({ job: slug, repo: "/tmp/repo", ...state }));
  };
  const task = (state) => [{ id: "T-01", state }];

  write("solo-empty", { route: "solo", tasks: [] });
  write("solo-todo", { route: "solo", tasks: task("todo") });
  write("solo-running", { route: "solo", tasks: task("running") });
  write("solo-blocked", { route: "solo", tasks: task("blocked") });
  write("crew-empty", { route: "crew", tasks: [] });
  write("crew-todo", { route: "crew", tasks: task("todo") });
  write("crew-blocked", { route: "crew", tasks: task("blocked") });

  const notice = jobsNotice(dir);

  for (const slug of ["solo-empty", "solo-todo", "solo-running", "solo-blocked"]) {
    check(
      `a state file that says \`solo\` is not unfinished crew work: ${slug}`,
      !notice.includes(slug),
      `the notice named ${slug}:\n${notice}`,
    );
  }
  for (const slug of ["crew-empty", "crew-todo", "crew-blocked"]) {
    check(
      `a \`crew\` job in the same state still is: ${slug}`,
      notice.includes(slug),
      `the notice did not name ${slug}, so this check proves nothing about the solo half:\n${notice}`,
    );
  }
  check(
    "the notice says how many jobs it is reporting",
    /Unfinished crew work: 3 jobs/.test(notice),
    `the count line reads ${JSON.stringify(notice.split("\n")[0])}`,
  );
} finally {
  cleanUp(dir);
}

done();
