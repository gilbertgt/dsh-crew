// T-138 (Crew V2) — the migration contract, checked across the files it spans.
//
// A `solo` job is not a small `crew` job: since V2 it keeps no job folder, no
// state file, no task row, no `Q-` file, no ADR and no CRD, and it never opens the
// crew flow. That contract lives in four places at once — the PM's core, the
// playbooks and their manifest, the two child personas that a `solo` job may start,
// and the host-side unfinished-job notice — so this case checks them TOGETHER
// rather than trusting any one file.
//
// What it proves:
//   1. no playbook is loaded with `read`, and the manifest never points a `solo`
//      job at the crew flow, the document ceremony or the state ledger;
//   2. the PM core says a `solo` job has no job folder, no state file and no
//      decision record, and opens no crew flow;
//   3. both personas a `solo` job can start carry a route-wide rule that turns
//      every crew document they mention into a TaskBrief/ReviewBrief field;
//   4. no child role can call `crew_playbook`: the allow-list roles do not name it
//      and every deny-list role denies it;
//   5. a state file that says `solo` is NOT reported as unfinished crew work,
//      while a `crew` one with no task list still is.

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { check, done, flat, pmCore, repoFile, rulesFile, tempDir, cleanUp } from "../lib/qa.mjs";
import { PLAYBOOKS, readPlaybook } from "../../host/playbooks.js";
import { ROLES } from "../../host/roles.js";
import { jobsNotice } from "../../host/jobs.js";

const core = flat(pmCore());

// ------------------------------------- 1. how a playbook is loaded, and by whom

for (const playbook of PLAYBOOKS) {
  const text = readPlaybook(playbook.file);
  check(
    `${playbook.file} points at the crew_playbook tool, not at \`read\``,
    /Read it with the `crew_playbook` tool/.test(text) && !/Read it with `read`/.test(text),
    "a playbook that tells the PM to open it with a workspace path is the bug the loader exists to close",
  );
}
check(
  "the core's playbook index names the tool, not a roles/playbooks path",
  /crew_playbook/.test(core) && !/`roles\/playbooks\//.test(core),
  "the PM's own index still hands out paths that only resolve inside a checkout",
);

const soloForbidden = ["crew-flow", "documents", "crew-state"];
for (const file of soloForbidden) {
  const playbook = PLAYBOOKS.find((entry) => entry.file === `${file}.md`);
  check(
    `the manifest sends only the crew route to ${file}`,
    playbook !== undefined && /^the route is `crew`/.test(playbook.when),
    `${file}'s "read it when" does not open by naming the crew route: ${JSON.stringify(playbook?.when)}`,
  );
}
check(
  "bug rows and decision records are crew-only in the manifest",
  !/solo/.test(PLAYBOOKS.find((entry) => entry.file === "bug-rows.md").when)
    && !/solo/.test(PLAYBOOKS.find((entry) => entry.file === "decisions.md").when),
  "a bug row or a decision record is asked for on a route that has neither",
);

// ------------------------------------------- 2. the core states the solo shape

check(
  "the core keeps a solo job out of the job folder and the state file",
  /a `solo` job keeps no job folder and no state file/.test(core),
  "the core still gives a solo job a folder, which is what puts it in front of the next session as unfinished crew work",
);
check(
  "the core gives a solo job no decision record",
  /A `solo` job\n?keeps no decision record|keeps no decision record/.test(core)
    && /There is no ADR and no CRD on this route/.test(core),
  "the core still hands `solo` an ADR or a CRD, which is a crew document on a route that has none",
);
check(
  "the core says a solo job never opens the crew flow",
  /`solo` never opens `crew-flow`/.test(core) && /A `solo` job never opens it/.test(core),
  "nothing stops a solo job from loading the ~95 KB flow",
);

// ---------------------------------------- 3. the personas a solo job can start

const PERSONAS = ["roles/engineer.md", "roles/security-reviewer.md"];
for (const relative of PERSONAS) {
  const persona = flat(rulesFile(relative));
  check(
    `${relative} carries a route-wide rule for the crew documents it mentions`,
    /Every rule below, by route/.test(persona)
      && /is a `route: crew`\s?rule/.test(persona)
      && /acceptance/.test(persona),
    `${relative} mentions crew documents without a rule that maps them onto the solo briefing, so a solo engineer reads a rule about a file it does not have`,
  );
}
check(
  "the engineer is told a solo blocker is reported, not filed",
  /write a `Q-` file" → report `blocked`/.test(flat(rulesFile("roles/engineer.md"))),
  "the persona still pushes a solo engineer towards a Q- file",
);

// ---------------------------------------------- 4. no child may load a playbook

for (const role of ROLES) {
  const named = [...(role.allow ?? []), ...(role.deny ?? [])];
  const allowed = role.allow === undefined ? undefined : role.allow.includes("crew_playbook");
  const denied = role.deny === undefined ? undefined : role.deny.includes("crew_playbook");
  check(
    `${role.key} cannot call crew_playbook`,
    allowed !== true && denied !== false,
    `${role.key} filters are ${JSON.stringify({ allow: role.allow, deny: role.deny })} — every child has to be closed, by an allow list that does not name it or a deny list that does`,
  );
  if (named.length === 0) {
    check(`${role.key} has a filter at all`, false, "a role with no filter has every tool this preset registers");
  }
}

// ------------------------------- 5. the host must not read a solo file as crew

const dir = tempDir("crew-qa-solo-state-");
try {
  const write = (slug, state) => {
    const job = join(dir, slug);
    mkdirSync(job, { recursive: true });
    writeFileSync(join(job, "state.json"), JSON.stringify(state));
  };
  write("solo-thing", { job: "solo-thing", repo: "/tmp/repo", route: "solo", tasks: [] });
  write("crew-thing", { job: "crew-thing", repo: "/tmp/repo", route: "crew", tasks: [] });
  const notice = jobsNotice(dir);

  check(
    "a state file that says `solo` is not unfinished crew work",
    !notice.includes("solo-thing"),
    `the notice named it:\n${notice}`,
  );
  check(
    "a `crew` job with no task list yet still is",
    notice.includes("crew-thing"),
    `the notice did not name the interrupted crew job:\n${notice}`,
  );
} finally {
  cleanUp(dir);
}

console.log(`      playbooks: ${PLAYBOOKS.map((playbook) => playbook.file).join(", ")}`);
console.log(`      roles checked: ${ROLES.map((role) => role.key).join(", ")}`);
done();
