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
//   1b. each playbook's OWN `**Read this when:**` line must state that same
//      condition word for word. The index and the manifest agreeing is not enough:
//      V2 shipped the header of `crew-flow.md` offering itself to "a `solo` job
//      that turned out to need a role beyond its one engineer" while the manifest
//      and the core both said `crew`, and nothing read the header;
//   2. `crew-routing.md` may not bind `solo` to a task row, a DoD row, step 9 or
//      the crew flow: that route has none of them, and its briefing is the
//      TaskBrief. It is the routing playbook, so it carries route selection, the
//      security question, role ownership and escalation — and no crew ceremony;
//   2b. `crew-flow.md` may never offer itself to a `solo` job in its own words
//      either, which is the same contradiction seen from the file's side;
//   2c. no shipped text — the core, the playbooks, `principles.md`,
//      `CONTRIBUTING.md`, `CLAUDE.md`, `README.md` — may hand a `solo` job a crew
//      document. V1's `solo` kept a task row and wrote its own ADR and CRD, and
//      three of those files still said so after V2 moved the contract;
//   2d. `direct` and `solo` reach no crew step number: `direct` carries its own
//      five steps, the `crew` bullet gates `crew-flow` on the route that owns it,
//      a `solo` blocker is answered in `send_message` rather than a document, and
//      `state.json` is the `crew` route's file alone;
//   3. `jobsNotice()` must never read a state file that says `solo` as unfinished
//      crew work — not when its task list is empty, and not when it holds open
//      tasks somebody wrote by hand.
//
// The three are one case because they are one contract: V2 says a `solo` job is a
// TaskBrief, one engineer and at most one named reviewer, with no crew documents
// and no ledger.

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { check, cleanUp, done, flat, pmCore, repoFile, tempDir } from "../lib/qa.mjs";
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

// ------------------- 1b. every playbook's own header says the manifest's words
//
// One comparison per file, not one for the collection: the header is what a
// reader sees once the file is open, and a file whose header invites a route the
// manifest excludes is a contradiction that survives every index check.
// `**Read this when:**` is the marker `tools/verify-mount.mjs` uses for the core's
// copy of these rules, and every playbook opens with it.

for (const playbook of PLAYBOOKS) {
  const name = playbook.file.replace(/\.md$/, "");
  const text = readPlaybook(playbook.file);
  const header = text.split(/\r?\n/).find((line) => line.startsWith("**Read this when:**"));
  const when = header === undefined
    ? null
    : header.replace("**Read this when:**", "").trim().replace(/\.$/, "");
  check(
    `${name}'s own \`Read this when:\` line is the manifest's condition, word for word`,
    when === playbook.when,
    header === undefined
      ? `${playbook.file} has no \`**Read this when:**\` line, so the file never states the condition it is read under`
      : `header: ${JSON.stringify(when)}\n      manifest: ${JSON.stringify(playbook.when)}`,
  );
}

for (const playbook of PLAYBOOKS) {
  const name = playbook.file.replace(/\.md$/, "");
  check(
    `${name} names its own condition exactly once`,
    readPlaybook(playbook.file).split(/\r?\n/)
      .filter((line) => line.startsWith("**Read this when:**")).length === 1,
    `a second header would let one line contradict the other: ${playbook.file}`,
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

// ---------------------- 2b. the crew flow never offers itself to a solo job

// The same contradiction from the other side. The header check above reads the
// `Read this when:` line alone; this one reads the body, because the sentence
// that sent a `solo` job into the crew flow lived in the flow's own words as well
// as in its header.
//
// Read LINE by line, not sentence by sentence: V2's own header sentence sat in a
// paragraph whose neighbouring clause carried the word "never", and a scan that
// split on sentence boundaries read the two as one and waved it through. A line is
// the unit a reader sees, and it is the unit an invitation is written in.
const flow = flat(readPlaybook("crew-flow.md"));
const SOLO_READS = /\b(read|reads|reading|open|opens|opening|load|loads)\b/i;
const FLOW_ANCHOR = /this file|crew-flow|numbered (flow|steps)|the flow below/i;
const NEGATED = /\bno\b|\bnot\b|\bnever\b|\bnone\b|\bnothing\b|\bborrows none\b/i;
const selfOffers = readPlaybook("crew-flow.md").split(/\r?\n/)
  .map((line, index) => ({ line: line.trim(), number: index + 1 }))
  .filter((entry) => /`solo`|\bsolo\b/i.test(entry.line)
    && SOLO_READS.test(entry.line)
    && FLOW_ANCHOR.test(entry.line)
    && !NEGATED.test(entry.line));

check(
  "crew-flow.md never offers itself to a `solo` job in its own words",
  selfOffers.length === 0,
  `these lines send a solo job into the crew flow: ${JSON.stringify(selfOffers)}`,
);
check(
  "crew-flow.md does say, out loud, that solo never opens it",
  /`solo` borrows none\s+of them and never opens this file/i.test(flow),
  "without that sentence the flow reads as the route's shared flow again",
);

// --------------- 2c. no shipped text hands a crew document to a `solo` job
//
// The contract is one sentence: a `solo` job keeps **no** task table and **no**
// task row, writes **no** ADR and **no** CRD, opens **no** PRD, and keeps no job
// folder — its acceptance list is the TaskBrief, and a choice that deserves a
// record re-routes the work to `crew`.
//
// V1 said the opposite, and the leftovers outlived the migration in three places
// the index check cannot see: `hard-rules.md` (the full list the PM reads when it
// is unsure), `principles.md` (the reasons), and `CONTRIBUTING.md` (the guide a
// contributor reads first). Every one of them looked right on its own, and the
// files that carried the new contract — the core, `CLAUDE.md`, `bug-rows.md`,
// `decisions.md`, `documents.md` — were never read against them.
//
// The judgement, per file, is two patterns, and each one is the shape the defect
// actually took in V1:
//
//   A. `solo` as the SUBJECT of a grant: "A `solo` change keeps the task table too",
//      "write the task row with its DoD section", "`solo` has a task row of its
//      own". A positive determiner ("the", "a", "its") right after the verb is what
//      makes it a grant, so "keeps no task row" and "keeps neither" never match.
//   B. a crew document whose route scope names `solo`: "gets a CRD in
//      `docs/decisions/crd/`, whoever asked — **on the `solo` and `crew` routes.**"
//      The V1 rule was scoped to both routes with no denial anywhere in it.
//
// Both patterns carry a guard for the two ways a correct sentence looks like a
// defect: a negation immediately in front of the `solo` subject ("Neither `solo`
// nor `direct` opens an opening document") and a denial immediately in front of the
// document ("no task row", "never opens a document that a CRD could change").
//
// What this does NOT prove: that a denial binds to the right noun two clauses away,
// and it reads English word order, so a grant written in a shape nobody has used
// yet can slip through. It is a wording pin, like every other check of a prompt —
// it stops the rule being deleted quietly, and it does not prove the behaviour.
const SOLO_CONTRACT_FILES = [
  "roles/pm.md",
  "roles/playbooks/hard-rules.md",
  "roles/playbooks/crew-flow.md",
  "roles/playbooks/crew-routing.md",
  "roles/playbooks/documents.md",
  "roles/playbooks/bug-rows.md",
  "roles/playbooks/decisions.md",
  "roles/playbooks/crew-state.md",
  "roles/playbooks/worktrees.md",
  "principles.md",
  "CONTRIBUTING.md",
  "CLAUDE.md",
  "README.md",
];
const CREW_DOCUMENT = "task table|task rows?|ADR|CRD|opening document";
const GRANT_VERB = "keeps?|has|have|gets?|carries|carry|writes?|opens?|becomes?|adds?|takes?|is|are";
const DENIAL = "\\b(no|not|never|none|neither|nor|without|nothing)\\b";
// A. `solo` (the subject) + a grant verb + a positive determiner + a document.
//    The subject-to-verb span is captured, because a denial inside it ("`solo` never
//    opens an opening document") denies the grant this pattern is looking for. That
//    span is up to 24 words: V1's `solo` flow announced itself and then granted the
//    task row 17 words later ("… five lines long: read the repository, ask at most
//    one question, write the task row with its DoD section"). The possessive is
//    allowed, because that flow was announced as "`solo`'s own flow".
const GRANT_TO_SOLO = new RegExp(
  `\`solo\`(?:'s)?((?:\\s+\\S+){0,24})\\s+(?:${GRANT_VERB})\\s+(?:the|a|an|its|their|one|two)\\s+(?:\\S+\\s+){0,2}(?:${CREW_DOCUMENT})`,
  "gi",
);
// B. a document, then a route scope that names `solo`, within one clause's reach.
//    `\*{0,2}` is there because V1 wrote that scope in bold: "whoever asked —
//    **on the `solo` and `crew` routes.**"
const DOCUMENT_SCOPED_TO_SOLO = new RegExp(
  `(?:${CREW_DOCUMENT})(?:\\s+\\S+){0,14}\\s+\\*{0,2}on the \`solo\``,
  "gi",
);

for (const file of SOLO_CONTRACT_FILES) {
  const text = flat(repoFile(file));
  const grants = [];
  const add = (label, match) => {
    const before = text.slice(Math.max(0, match.index - 24), match.index);
    if (new RegExp(`${DENIAL}\\s*$`, "i").test(before)) return;
    grants.push(`${label}: …${text.slice(Math.max(0, match.index - 90), match.index + 70).trim()}…`);
  };
  for (const match of text.matchAll(GRANT_TO_SOLO)) {
    // "Neither `solo` nor `direct` opens an opening document" is a denial, and the
    // negation sits in front of the subject this pattern is anchored on.
    const before = text.slice(Math.max(0, match.index - 12), match.index);
    if (/\b(neither|nor|no|not)\s+$/i.test(before)) continue;
    // "`solo` never opens an opening document": the denial governs the verb, so it
    // is the last word of the subject-to-verb span or the one before it. Anything
    // further back denies some other verb in the same sentence — which is exactly
    // how "A `solo` change keeps the task table too but opens no PRD" survived a
    // read-through, and why this is judged word by word instead of by sentence.
    const words = match[1].trim().split(/\s+/).filter((word) => word !== "");
    const governs = (word) => word !== undefined && /^(no|not|never|none|neither|nor|without|nothing)\b/i.test(word);
    if (governs(words.at(-1)) || governs(words.at(-2))) continue;
    add("solo as the subject of a grant", match);
  }
  for (const match of text.matchAll(DOCUMENT_SCOPED_TO_SOLO)) add("a document scoped to solo", match);
  check(
    `${file} hands a \`solo\` job no crew document`,
    grants.length === 0,
    `these places grant a crew document to \`solo\` without denying it: ${JSON.stringify([...new Set(grants)])}`,
  );
}

check(
  "hard-rules.md says out loud what a `solo` job keeps instead of a task row",
  /`solo`\s+change opens no PRD and keeps no task table and no task row/i.test(flat(readPlaybook("hard-rules.md")))
    && /acceptance\s+list is the TaskBrief/i.test(flat(readPlaybook("hard-rules.md"))),
  "the rule list no longer says a solo job's acceptance list is its TaskBrief, so the crew documents it must NOT keep are unreadable there",
);

// The two shapes the patterns above cannot see by structure, pinned by wording
// instead — the same lower bound `qa/T-64/case-03` and `qa/T-137/case-05` use for
// wordings that have to stay gone. Both are V1 sentences whose subject is not
// `solo`: the engineer is started "from a task row instead", and `solo` "borrows
// step 9" of a flow the route may not open at all.
const BANNED_SOLO_WORDINGS = [
  "from a task row instead",
  "borrowing step 9",
];
for (const phrase of BANNED_SOLO_WORDINGS) {
  const offenders = SOLO_CONTRACT_FILES.filter((file) => flat(repoFile(file)).toLowerCase().includes(phrase.toLowerCase()));
  check(
    `the V1 wording ${JSON.stringify(phrase)} is gone from every shipped rule file`,
    offenders.length === 0,
    `these files carry it again: ${JSON.stringify(offenders)} — it reads as a task row on a route that keeps none`,
  );
}

// --------------- 2d. the two routes the core describes without the crew flow,
//                     and the three rules the rule list states about them
//
// Three of the sentences here are one contract with the core: `direct` and `solo`
// never open the ~95 KB crew flow, a `solo` blocker is answered in a message
// rather than a document, and `state.json` is the `crew` route's file alone.
const coreFlat = flat(core);
const directBullet = (() => {
  const at = core.indexOf("- `direct` — ");
  if (at === -1) return "";
  const rest = core.slice(at);
  const end = rest.indexOf("\n- `solo` — ");
  return flat(end === -1 ? rest.slice(0, 2500) : rest.slice(0, end));
})();

check(
  "the core still has a `direct` bullet to judge",
  directBullet.length > 200,
  "the `direct` route moved or was renamed past recognition, so nothing below could be judged",
);
check(
  "`direct` has a flow of its own, with its five steps named",
  ["`inspect`", "`edit`", "targeted validation", "completion gate", "`commit`"]
    .every((step) => directBullet.includes(step)),
  `the \`direct\` route does not spell out its own flow: ${JSON.stringify(directBullet.slice(0, 400))}`,
);
check(
  "the `direct` bullet names no crew step number, and says it never opens the flow",
  !/\bstep\s*\d/i.test(directBullet) && /never opens `crew-flow`/i.test(directBullet),
  `a \`direct\` job that is told a step number has to open the crew flow to find it: ${JSON.stringify(directBullet.slice(0, 400))}`,
);
check(
  "`crew-flow` is read after choosing `crew`, by that route only",
  /Read\s+`crew-flow` only after choosing this route/i.test(coreFlat)
    && /neither `direct` nor `solo` ever opens it/i.test(coreFlat),
  "the crew bullet no longer gates the flow on the route that owns it",
);
check(
  "the `solo` route says, twice, that the crew flow is not its own",
  /`solo` never opens `crew-flow`/i.test(coreFlat)
    && /a `solo` job never opens it/i.test(coreFlat),
  "nothing in the core stops a `solo` job from opening the crew flow",
);

const hard = flat(readPlaybook("hard-rules.md"));
check(
  "a `solo` blocker may be answered in `send_message`, with no document written first",
  /a `solo` job has no job folder, no `Q-` file and no task row\s+to write one into/i.test(hard)
    && /its blocker and the answer to it live in the two messages\s+themselves/i.test(hard)
    && /`send_message` back to that same continuable engineer/i.test(hard),
  `the rule list still asks for a document before a solo blocker can be answered: ${JSON.stringify(hard.slice(hard.indexOf("Nothing that matters"), hard.indexOf("Nothing that matters") + 500))}`,
);
check(
  "`state.json` is the `crew` route's file in the rule list",
  /`state\.json` belongs to the `crew` route/i.test(hard)
    && /\*\*`direct` and `solo` never create it\s+and never update it\*\*/i.test(hard),
  "the rule list no longer says which routes may write the ledger",
);
check(
  "bug escalation names the document for the route the bug lands on",
  /`direct` → `solo`: write the \*\*TaskBrief\*\* before the\s+engineer starts/i.test(hard)
    && /and \*\*never a task row\*\*, because a `solo` job keeps none/i.test(hard)
    && /`direct` or `solo` → `crew`: write the\s+\*\*task row first\*\*, before the crew engineer starts/i.test(hard),
  `a bug escalating to \`solo\` would be given the wrong record: ${JSON.stringify(hard.slice(hard.indexOf("A bug on the `crew` route"), hard.indexOf("A bug on the `crew` route") + 500))}`,
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
