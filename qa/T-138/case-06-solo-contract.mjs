// T-138 (Crew V2) — the `solo` contract, checked across the three files that
// have to agree about it.
//
// A `solo` job is the PM, one `crew_engineer`, and at most one named reviewer.
// There is no opening document and no task row on that route, so the TaskBrief is
// the whole contract — which means three texts have to line up or the route breaks
// in a way no single-file check would see:
//
//   - the PM's core says what a TaskBrief carries, and that `solo` sends no
//     engineer looking for a PRD, a task row, an ADR or a `Q-` file;
//   - `crew_engineer`'s composed persona says the same thing from the other side,
//     and reports the same five `Result` fields the PM expects back;
//   - `crew_security_reviewer`'s composed persona, the role a `solo` job may add,
//     is given a ReviewBrief (goal + acceptance + diff) rather than a PRD.
//
// What this case proves, by comparing the texts rather than searching each one
// alone:
//   1. the PM's TaskBrief field list and the engineer's Result field list are the
//      SAME fields, extracted from both files and compared as sets;
//   2. both child personas branch on `route`, and the PM's core says the briefing
//      carries it;
//   3. in the `solo` branch of each child persona, every mention of a document
//      that does not exist on that route (PRD, task row, `Q-` file, ADR, CRD) is
//      inside a sentence that denies it — "no PRD", never "read the PRD";
//   4. the security reviewer's `solo` branch names the acceptance list, and its
//      `crew` branch names the PRD and the task row, so the two are not the same
//      instruction;
//   5. one mutation — a renamed Result field in the engineer's file — turns the
//      cross-file comparison red.

import { check, copyFile, done, edit, flat, pmCore, rulesFile, tempRepo, cleanUp } from "../lib/qa.mjs";
import { ROLES, TAIWAN_LANGUAGE_POLICY } from "../../host/roles.js";
import { composeChildPersona } from "../../host/child-policy.js";

const ENGINEER = "roles/engineer.md";
const SECURITY = "roles/security-reviewer.md";

/** One role's composed persona, read out of a repository copy. */
function personaIn(dir, relative) {
  const role = ROLES.find((entry) => `roles/${entry.personaFile}` === relative);
  return composeChildPersona({
    roleText: copyFile(dir, relative),
    policy: role?.policy,
    languagePolicy: TAIWAN_LANGUAGE_POLICY,
  });
}

/**
 * The backticked field names a passage declares, taking only `` `name` (`` — the
 * shape both the PM's TaskBrief list and the engineer's Result list use. Prose
 * mentions in other shapes are deliberately not collected: a field list is what is
 * being compared, not every backticked word in the paragraph.
 */
const fieldsIn = (text) => [...flat(text).matchAll(/`([a-z][a-z ]+)` \(/g)].map((hit) => hit[1]);

/** The passage between one bold marker and the next, flattened. */
function passage(text, marker, next) {
  const from = text.indexOf(marker);
  if (from === -1) return "";
  const rest = text.slice(from + marker.length);
  const to = next === undefined ? -1 : rest.indexOf(next);
  return flat(to === -1 ? rest : rest.slice(0, to));
}

/**
 * The `solo` half of a route branch.
 *
 * It runs from the `solo` bullet to whatever ends that bullet — the `crew` bullet
 * when the file lists `crew` second, or the next numbered item / heading when it
 * lists `crew` first, which `roles/engineer.md` does. Slicing to "the next
 * `route: crew`" instead would run to the end of the file in that case and judge
 * the whole persona as if it were the solo branch.
 */
function soloBranch(text) {
  const hit = /- `route: solo`[\s\S]*?(?=\n- `route: crew`|\n\d+\. |\n## |$)/.exec(text);
  return hit === null ? "" : flat(hit[0]);
}

const core = pmCore();
const engineer = rulesFile(ENGINEER);
const security = rulesFile(SECURITY);

// ------------------------------- 1. the two field lists are the same fields

const taskBrief = fieldsIn(passage(core, "**TaskBrief**", "**Result**"));
const resultCore = fieldsIn(passage(core, "**Result**", "**On `solo` the TaskBrief"));
const resultEngineer = fieldsIn(passage(engineer, "the five fields of a `Result`", "Within that"));

check(
  "the PM's TaskBrief lists its fields",
  taskBrief.length >= 6,
  `collected ${JSON.stringify(taskBrief)} from the TaskBrief passage`,
);
check(
  "the TaskBrief carries the route the child has to branch on",
  taskBrief.includes("route"),
  `TaskBrief fields are ${JSON.stringify(taskBrief)} — a briefing with no route leaves the engineer guessing which contract it is under`,
);
check(
  "the PM's Result fields and the engineer's Result fields are the same fields",
  resultCore.length >= 4
    && resultEngineer.length >= 4
    && [...resultCore].sort().join("|") === [...resultEngineer].sort().join("|"),
  `PM: ${JSON.stringify(resultCore)}; engineer: ${JSON.stringify(resultEngineer)}. These are the two ends of one report — a field named at one end and not the other is a field nobody fills in`,
);
check(
  "both ends carry the route, so each role can tell which contract it is under",
  /route/i.test(core) && /- `route: solo`/.test(engineer) && /- `route: crew`/.test(engineer),
  "the engineer's persona does not branch on the route the briefing carries",
);

// ------------------- 2. the solo branch never asks for a document that is absent

const SOLO_FORBIDDEN = ["PRD", "task row", "Q-", "ADR", "CRD"];

/** Sentences that mention a document absent on `solo` without denying it. */
function unbacked(soloText) {
  const sentences = soloText.split(/(?<=[.!?])\s+/);
  return sentences.filter((sentence) => SOLO_FORBIDDEN.some((name) => sentence.includes(name))
    && !/\bno\b|\bnot\b|\bnever\b|\bnothing\b/i.test(sentence));
}

const engineerSolo = soloBranch(engineer);
const securitySolo = soloBranch(security);

check(
  "the engineer's persona really has a solo branch",
  engineerSolo.length > 200,
  `the \`route: solo\` half is ${engineerSolo.length} characters`,
);
check(
  "the engineer's solo branch asks for no document that route does not have",
  engineerSolo.length > 0 && unbacked(engineerSolo).length === 0,
  `these sentences send a solo engineer after something that does not exist: ${JSON.stringify(unbacked(engineerSolo))}`,
);
check(
  "the security reviewer's persona really has a solo branch",
  securitySolo.length > 150,
  `the \`route: solo\` half is ${securitySolo.length} characters`,
);
check(
  "the security reviewer's solo branch asks for no document that route does not have",
  securitySolo.length > 0 && unbacked(securitySolo).length === 0,
  `these sentences send a solo reviewer after something that does not exist: ${JSON.stringify(unbacked(securitySolo))}`,
);
check(
  "the security reviewer's solo branch names the acceptance list instead",
  /acceptance/i.test(securitySolo),
  "a solo security review with neither a PRD nor an acceptance list has nothing to judge the change against",
);
check(
  "the security reviewer's crew branch still names the PRD and the task row",
  /PRD/.test(flat(security)) && /task row/.test(flat(security)),
  "the crew half lost the documents it is supposed to read",
);
check(
  "the PM still says a solo job may carry one security review",
  /`solo` plus one security review is a normal outcome/.test(flat(core)),
  "the routing text no longer allows the combination this case checks",
);

// ------------------- 3. the solo route's own rules are in the always-loaded core

check(
  "the core tells a solo job never to open the crew flow",
  // The index's own column carries this condition in the manifest's words —
  // `qa/T-138/case-09` checks the two agree word for word.
  /a `solo` job never opens it/i.test(flat(core)) && /`solo` never opens `crew-flow`/.test(flat(core)),
  "nothing in the core stops a solo job from reading the ~95 KB crew flow, which is the loading V2 exists to avoid",
);
check(
  "the solo route's briefing, blocker, Result and gate rules are written out in the core",
  /On `solo` the TaskBrief is the whole contract/.test(flat(core))
    && /A `solo` blocker comes back to the same engineer/.test(flat(core))
    && /Targeted validation, then one commit/.test(flat(core)),
  "one of those rules is not in the core, so a solo job would have to open the crew flow to find it",
);

// ------------------- 4. the ReviewBrief: the PM produces it, the reviewer consumes it
//
// The gap this closes: the reviewer's own contract demands a `goal` and an
// `acceptance` list, and the PM's solo flow used to hand it a diff and a test
// result and nothing else. A reviewer is a NEW child — it inherits nothing from
// the engineer's briefing — so a producer that names two fields and a consumer
// that needs four is a route that breaks in a way no single-file check sees.

const reviewBriefPassage = () => flat(passage(core, "**The `ReviewBrief`", "**Which roles a `solo` job may start"));
const reviewBrief = fieldsIn(reviewBriefPassage());
const REVIEW_FIELDS = ["goal", "acceptance", "diff", "tests"];

check(
  "the PM's core defines the ReviewBrief the named reviewer is given",
  reviewBrief.includes("route") && REVIEW_FIELDS.every((field) => reviewBrief.includes(field)),
  `the core's ReviewBrief names ${JSON.stringify(reviewBrief)} — a briefing missing one of ${JSON.stringify(REVIEW_FIELDS)} is a reviewer that cannot do its job`,
);
check(
  "the ReviewBrief's goal and acceptance come from the TaskBrief, not from nowhere",
  /`goal` \(one sentence, from the TaskBrief\)/i.test(reviewBriefPassage())
    && /`acceptance` \(the same\s+runnable list the engineer worked from/i.test(reviewBriefPassage()),
  "the ReviewBrief does not say where its two document-like fields come from, so the PM can invent them",
);
check(
  "the security reviewer's solo branch asks for the same four fields the PM promises",
  REVIEW_FIELDS.every((field) => new RegExp(`\`${field}\``).test(securitySolo)),
  `the reviewer's solo branch names ${JSON.stringify(REVIEW_FIELDS.filter((field) => !new RegExp(`\`${field}\``).test(securitySolo)))} less than the PM's ReviewBrief does: ${JSON.stringify(securitySolo)}`,
);
check(
  "the reviewer is told what to do when the acceptance list is missing",
  /no `acceptance` list, say so/i.test(securitySolo),
  "a solo reviewer handed no acceptance list has nothing to judge against and no instruction to ask for one",
);

// ------------------- 5. the engineer's Result is compact on solo
//
// The output contract, one route at a time: `solo` has no task row, so it has no
// task id, and the red/green output that used to be pasted into the report is
// what V2 moved into an artifact.

const engineerDone = flat(passage(engineer, "Within that:", "On either route"));
check(
  "the engineer's solo report is the five fields and no task id",
  /On `solo` that is the whole report, and it stays short/i.test(engineerDone)
    && /no task id on\s+this route/i.test(engineerDone)
    && /one line\*\* of\s+red→green evidence/i.test(engineerDone),
  `the engineer is still asked for a crew-shaped report on the route that has no task row: ${JSON.stringify(engineerDone.slice(0, 400))}`,
);
check(
  "the richer evidence is asked for on `crew`, and only there",
  /On `crew` the task row exists, so more is asked, and only there/i.test(engineerDone)
    && /the task id, and one sentence on what you did/i.test(engineerDone)
    && /failing output you saw \*\*before\*\* the code existed/i.test(engineerDone),
  "the crew half lost the evidence its task row is measured against",
);
check(
  "long red/green output goes to the artifact the briefing named, not into the report",
  /long output goes to the \*\*artifact path the\s+briefing named\*\*/i.test(engineerDone),
  "the report is where the evidence goes again, which is the token cost V2 removed",
);

// --------------------------------------------- 3. one mutation, in one file

const dir = tempRepo();
let renamed = [];
try {
  edit(dir, ENGINEER, "`remaining risk` (what you did not", "`residual risk` (what you did not");
  const broken = personaIn(dir, ENGINEER);
  const brokenFields = fieldsIn(passage(broken, "the five fields of a `Result`", "Within that"));
  renamed = [...resultCore].sort().join("|") === [...brokenFields].sort().join("|") ? [] : brokenFields;
} finally {
  cleanUp(dir);
}
check(
  "mutation: renaming one Result field in the engineer's file turns this case red",
  renamed.length > 0,
  "the engineer's Result list was changed and the cross-file comparison did not notice",
);

console.log(`      TaskBrief: ${taskBrief.join(", ")}`);
console.log(`      Result: ${resultCore.join(", ")}`);
done();
