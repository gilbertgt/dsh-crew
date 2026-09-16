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
