// T-137 DoD items 6, 9 and 10 — no rule in the PM prompt may quietly add work to
// a `direct` change, the three flows have to stay separate, and an ADR and a CRD
// belong to the routes that write documents. `CONTRIBUTING.md`, the same rule told
// to a contributor, is judged with it.
//
// A route is only real if the rules that come after it cannot override it. That
// was the whole defect: step 1 said `direct` starts no PRD, no task row and no
// review, and then three later sections said the opposite in a voice that named
// no route at all — "**Whatever its size.** A typo, a rename, a one-line change:
// each of them is a bug with a task row of its own", "In the `team` lane a bug is
// a task like any other task", "Write the opening document — a PRD, on small work
// and on big work alike", and a hard-rules bullet claiming both small and big work
// open a PRD. A reader following the later rule does the work; a reader following
// step 1 skips it, and the prompt does not say which one wins.
//
// So this case judges the whole prompt, not one section, and it does it four
// ways:
//
//   1. the `direct` bullet must name every skip it makes, documents and decision
//      records alike;
//   2. every section that states one of those rules must name the routes it
//      applies to — the bug section, step 2, step 4, the ADR section, the CRD
//      section, the hard-rules bullets, and the two flow headings;
//   3. the `solo` flow is named in full, and the numbered flow says it is the
//      `crew` route's and not `solo`'s;
//   4. a general scan: no unit may pair a whole-job quantifier ("every change",
//      "every job", "whatever its size", "no exception") with a required artifact
//      (a PRD, a task row, an interview, an ADR, a CRD, a QA case, a review round)
//      unless that same unit names a route. That is the part that catches a NEW
//      sentence, not only the ones that used to be here.
//
// Everything is judged on FLATTENED text: `roles/pm.md` wraps at about 80 columns
// and the word "direct" can land on the next line, so a line-based scan would
// report a scoped rule as unscoped.
//
// The second half of the case reads `CONTRIBUTING.md`, which is the same rule told
// to a contributor and carried the same defect — "Every change, whatever its size,
// is a `team` job. There is no lane where a file is changed alone. A milestone is
// one full cycle plus one commit: at least one task, one round of QA, and one round
// of each review." — and now has to show the three routes, one row each.
//
// Nine mutations put the old text back, one piece at a time, and demand the run go
// red: the banned opener, a missing skip in the `direct` bullet, step 4's scoping
// sentence, the hard-rules PRD bullet's `crew` scoping, a NEW unconditional rule
// the banned list has never seen, the contributor guide's old wording, the ADR
// heading losing its routes, the ADR section losing its `direct` exemption, and
// the `direct` bullet forgetting it writes neither an ADR nor a CRD.
//
// The units the rules are judged in are paragraphs cut again at every bullet. That
// second cut was learned the hard way here: the **Hard rules** list is one
// paragraph of twenty-four bullets, so judging it whole let one bullet's route name
// vouch for a *different* bullet that had lost its own scoping, and mutation 4
// passed on a broken file until the cut was added.
//
// Reads `roles/pm.md` and `CONTRIBUTING.md`; writes only inside throwaway copies,
// which it removes.

// V2: `pm()`/`pmRules()` are the composed rules (the always-loaded core plus every
// playbook), which is what "the PM prompt says X" means now that half of the rules
// live in `roles/playbooks/`. `composePmRulesIn(dir)` is the same text read back
// out of a throwaway copy, so a mutation written into a playbook is really judged.
import { check, cleanUp, composePmRulesIn, copyFile, done, edit, flat, pm, pmRules, repoFile, step, tempRepo } from "../lib/qa.mjs";

const LANE = "Step 1: pick a lane, every time";
const BUG_HEADING = "## A bug becomes a task row";

// `CONTRIBUTING.md` is the same rule told to a contributor, and it carried the
// same defect: "Every change, whatever its size, is a `team` job. There is no
// lane where a file is changed alone. A milestone is one full cycle plus one
// commit: at least one task, one round of QA, and one round of each review."
// Those two wordings are what this half judges, plus the three-route table that
// replaced them.
const CONTRIBUTING_BANNED = [
  "every change, whatever its size, is a `team` job",
  "there is no lane where a file is changed alone",
  "at least one task, one round of qa, and one round of each review",
];

// The wordings that made `direct` unreadable, exactly as they stood. Each is
// judged flattened and case-insensitively, so a re-wrapped or re-cased copy is
// still caught — that is how the first one hid from a line-based grep here.
//
// The ADR and the CRD halves of the same defect are judged by structure instead
// (`ID.adrHeading`, `ID.crdHeading`, `ID.adrScoped`, `ID.crdScoped`): their
// sentences survive, scoped, so a string that is still legitimately in the file
// would be a ban that fires on a correct prompt.
//
// The last three are the round-two defect: the `solo` flow said a decision that
// deserved a record moves the work up to `crew` (against the ADR section, which
// puts `solo` on the ADR routes), and the numbered-flow statement said neither
// route starts a reviewer at all (against the routing decision table, which puts a
// `crew_security_reviewer` on a `solo` change).
const BANNED = [
  "whatever its size.",
  "there is no longer a lane that skips it",
  "a bug is a task like any other task",
  "each of them is a bug with a task row of its own",
  "never writes an adr or a crd for a small implementation choice",
  "moves the work up to",
  "starts an architect, qa or a reviewer",
];

// What the `direct` bullet has to say it skips: one entry per thing the route must
// not grow back, documents and decision records included.
const REQUIRED_SKIPS = [
  ["no child role", /start \*\*no\*\* child role/i],
  ["the Socratic interview, by step", /Socratic interview \(step 2\)/i],
  ["the PRD", /no PRD\b/i],
  ["the HLD", /no HLD\b/i],
  ["the ADR", /no ADR\b/i],
  ["the CRD", /no CRD\b/i],
  ["the design document", /no design document/i],
  ["task rows in `docs/tasks/`", /no task rows?\b[^.]{0,40}`docs\/tasks\/`/i],
  ["the QA case folder", /no QA case folder/i],
  ["the review round", /no review round/i],
  ["the numbered team steps", /numbered team steps/i],
];

// The general scan's three halves, and why each is narrow.
//
// The quantifier must be about a UNIT OF WORK ("every change", "every job",
// "every bug", "each of them"), not about a list of documents: `roles/pm.md`
// legitimately writes "and an accepted CRD ... `all of them`" and "answer
// `every one of them`" about the roles a message started, and flagging those
// would make this case noise that the next person widens or deletes.
//
// A quantifier alone is not a rule either: "it changes with `every job`" is
// about a file name. What makes it a rule is a requirement verb right after it,
// so CONTAINS_A_REQUIREMENT looks in the window that follows.
const WHOLE_JOB = /\b(every change|every job|each job|every bug|whatever its size|no exception|each of them)\b/i;
const CONTAINS_A_REQUIREMENT = /\b(gets?|opens?|carries|carry|becomes?|must|needs?|requires?|has to|have to|is a|are a|takes?|starts?)\b/i;
const REQUIRED_ARTIFACT = /\b(PRD|opening document|HLD|design document|task rows?|ADR|CRD|interview|QA case|review round|milestone reviews?|release plans?|reviews)\b/i;
const NAMES_A_ROUTE = /`(crew|solo|direct)`/;

/** Does one flattened paragraph state a rule for every unit of work? */
function claimsEveryChange(block) {
  const quantifier = WHOLE_JOB.exec(block);
  if (quantifier === null) return false;
  const after = block.slice(quantifier.index, quantifier.index + 160);
  return CONTAINS_A_REQUIREMENT.test(after);
}

// --------------------------------------------------------------- slicing

/** The `direct` bullet of step 1, or "". */
function directBullet(text) {
  const at = text.indexOf(`## ${LANE}`);
  if (at === -1) return "";
  const lane = text.slice(at);
  const start = lane.indexOf("- `direct` — ");
  if (start === -1) return "";
  const rest = lane.slice(start);
  const end = rest.indexOf("\n- `solo` — ");
  return end === -1 ? rest.slice(0, 2500) : rest.slice(0, end);
}

/** One `## ` section by the start of its heading line, or "". */
function blockFrom(text, headingStart) {
  const at = text.indexOf(headingStart);
  if (at === -1) return "";
  const rest = text.slice(at);
  const end = rest.indexOf("\n## ", 4);
  return end === -1 ? rest : rest.slice(0, end);
}

/**
 * The units a rule is judged in: a blank-line paragraph, cut again at every
 * bullet.
 *
 * The second cut is load-bearing and was learned here: the **Hard rules** list is
 * one blank-line paragraph of twenty-four bullets, so judging it whole let one
 * bullet's route name ("on the `solo` and `crew` routes") vouch for a *different*
 * bullet that had lost its own scoping. A mutation that stripped the PRD bullet's
 * `crew` stayed green under that reading. Judging each bullet on its own closes it.
 */
const units = (text) => text
  .split(/\n\s*\n/)
  .flatMap((block) => block.split(/\n(?=\s*-\s)/))
  .map((block) => flat(block))
  .filter((block) => block !== "");

// ----------------------------------------------------------------- the audit

const ID = {
  lane: `roles/pm.md still has a "## ${LANE}" section`,
  direct: "the `direct` bullet can be sliced out of step 1",
  bugHeading: "the bug section's heading names the routes it applies to",
  bugScoped: "the bug section scopes its task-row rule and exempts `direct`",
  step2: "step 2 names the route it runs on",
  step4: "step 4 names the route that opens a PRD",
  prdBullet: "the hard-rules PRD bullet is scoped to the `crew` route",
  adrHeading: "the ADR section's heading names the routes it applies to",
  adrScoped: "the ADR section exempts `direct` and re-routes a decision that needs a record",
  crdHeading: "the CRD section's heading names the routes it applies to",
  crdScoped: "the CRD section exempts `direct`",
  soloFlow: "step 1 spells out the `solo` flow and says the numbered flow is not for it",
  soloReviewer: "the `solo` flow allows exactly the one reviewer step 1 named, and no more",
  soloAdr: "the `solo` flow keeps its own ADR instead of escalating the decision to `crew`",
  crewFlow: "the numbered flow says it belongs to the `crew` route, and names the two steps `solo` borrows",
  decisionsAgree: "all four shipped documents put the ADR on the same routes",
  quantifier: "no paragraph pairs a whole-job claim with a required artifact without naming a route",
};
const skipId = (what) => `the \`direct\` bullet says it skips ${what}`;
const bannedId = (phrase) => `the old wording ${JSON.stringify(phrase)} is gone from roles/pm.md`;

function audit(text) {
  const results = [];
  const add = (id, ok, detail = "") => results.push({ id, ok, detail });
  const whole = flat(text);

  // --- premise: step 1 exists, and its `direct` bullet can be read ---------
  add(ID.lane, text.includes(`## ${LANE}`), "step 1 moved or was renamed, so the route rules cannot be judged where they live");
  const bullet = directBullet(text);
  add(ID.direct, bullet !== "", "the `direct` bullet was not found in step 1 — the route list moved or was reworded past recognition");
  const flatBullet = flat(bullet);
  for (const [what, pattern] of REQUIRED_SKIPS) {
    add(skipId(what), pattern.test(flatBullet), `the \`direct\` bullet does not say it skips ${what}: ${JSON.stringify(flatBullet.slice(0, 500))}`);
  }

  // --- the bug section ------------------------------------------------------
  const bug = blockFrom(text, BUG_HEADING);
  const bugHeadingLine = text.split("\n").find((line) => line.startsWith(BUG_HEADING)) ?? "";
  add(
    ID.bugHeading,
    bugHeadingLine !== "" && /`crew`/.test(bugHeadingLine) && /`solo`/.test(bugHeadingLine),
    `the heading reads ${JSON.stringify(bugHeadingLine)} — a section called "a bug becomes a task row" with no route in it is the rule this task removed`,
  );
  add(
    ID.bugScoped,
    bug !== ""
      && /`crew` and `solo`/.test(flat(bug))
      && /`direct` bug gets no row/i.test(flat(bug)),
    bug === ""
      ? `no "## ${BUG_HEADING}" section was found`
      : `the bug section does not both name the routes and exempt \`direct\`: ${JSON.stringify(flat(bug).slice(0, 400))}`,
  );

  // --- the two steps that carry a ceremony --------------------------------
  let two = "";
  let four = "";
  try { two = flat(step(text, 2)); } catch { /* reported below */ }
  try { four = flat(step(text, 4)); } catch { /* reported below */ }
  add(
    ID.step2,
    /`crew` route/i.test(two) && /`direct` skips it/i.test(two) && /`solo` never runs it/i.test(two),
    `step 2 does not say it is the \`crew\` route's and is skipped on \`direct\` and \`solo\`: ${JSON.stringify(two.slice(0, 300))}`,
  );
  add(
    ID.step4,
    /`crew` route/i.test(four) && /`solo` opens no PRD/i.test(four) && /`direct` writes no document/i.test(four),
    `step 4 does not scope the PRD to the \`crew\` route and name \`solo\`/\`direct\` as the routes without one: ${JSON.stringify(four.slice(0, 300))}`,
  );

  // --- the two decision records, and the flow they belong to ---------------
  //
  // This is the half the review round of this task added: an ADR and a CRD were
  // rules for EVERY change, so a one-line `direct` fix owed the same two files a
  // cross-module refactor did. The headings and the exemptions are judged, and so
  // is the re-route: a decision that really deserves a record is a different
  // route, not a different document.
  const adr = blockFrom(text, "## Decisions about how");
  const adrHeadingLine = text.split("\n").find((line) => line.startsWith("## Decisions about how")) ?? "";
  add(
    ID.adrHeading,
    adrHeadingLine !== "" && /`solo`/.test(adrHeadingLine) && /`crew`/.test(adrHeadingLine),
    `the ADR section heading reads ${JSON.stringify(adrHeadingLine)} — a section called "every one gets an ADR" with no route in it is the rule this task removed`,
  );
  const flatAdr = flat(adr);
  add(
    ID.adrScoped,
    adr !== ""
      && /`direct` change writes no ADR/i.test(flatAdr)
      && /re-route/i.test(flatAdr),
    adr === ""
      ? "no `## Decisions about how` section was found"
      : `the ADR section does not both exempt \`direct\` and send a decision that needs a record up a route: ${JSON.stringify(flatAdr.slice(0, 400))}`,
  );

  const crd = blockFrom(text, "## Change requests:");
  const crdHeadingLine = text.split("\n").find((line) => line.startsWith("## Change requests:")) ?? "";
  add(
    ID.crdHeading,
    crdHeadingLine !== "" && /`crew`/.test(crdHeadingLine) && /`solo`/.test(crdHeadingLine),
    `the CRD section heading reads ${JSON.stringify(crdHeadingLine)} — it has to name the routes it applies to`,
  );
  add(
    ID.crdScoped,
    crd !== "" && /`direct` change writes no CRD/i.test(flat(crd)),
    crd === ""
      ? "no `## Change requests:` section was found"
      : `the CRD section does not exempt \`direct\`: ${JSON.stringify(flat(crd).slice(0, 400))}`,
  );

  // --- the two flows, named where a reader meets them ----------------------
  const lane = blockFrom(text, `## ${LANE}`);
  const flatLane = flat(lane);
  add(
    ID.soloFlow,
    /The `solo` flow, in full/i.test(flatLane)
      && /Read the repository first/i.test(flatLane)
      && /Ask at most one question/i.test(flatLane)
      // V2: `solo`'s third bullet writes the TaskBrief, not a task row — the route
      // has no task table, and its brief is the whole contract with the engineer.
      && /Write the TaskBrief/i.test(flatLane)
      && /Start one `crew_engineer`/i.test(flatLane)
      && /never opens\s+an opening document/i.test(flatLane),
    `step 1 does not spell out the five-line \`solo\` flow and what it never does: ${JSON.stringify(flatLane.slice(0, 400))}`,
  );

  // The two round-two defects, pinned as their own checks so a fix cannot pass by
  // rewriting the paragraph around them.
  //
  // 1. `solo` may start exactly the one reviewer step 1 named — the routing
  //    decision table puts a `crew_security_reviewer` on a `solo` change, and step
  //    10's exception says the same. "no QA, no reviewer" as a blanket rule
  //    contradicted both.
  add(
    ID.soloReviewer,
    /plus the single\s+reviewer step 1 named if it named one/i.test(flatLane)
      && /starts no role beyond\s+that one engineer and that one named reviewer/i.test(flatLane),
    `the \`solo\` flow does not allow exactly one named reviewer and forbid the rest: ${JSON.stringify(flatLane.slice(0, 500))}`,
  );
  // 2. A choice that deserves a record is `solo`'s own ADR, because the ADR
  //    section lists `solo` among the routes that write one. Sending the work up to
  //    `crew` instead made the two sections disagree.
  add(
    ID.soloAdr,
    /A choice that deserves its own\s+record \*\*is\*\* `solo`'s business: you write that ADR yourself/i.test(flatLane),
    `the \`solo\` flow does not say that a decision deserving a record is written as \`solo\`'s own ADR: ${JSON.stringify(flatLane.slice(0, 500))}`,
  );
  const crewFlow = blockFrom(text, "## The `crew` flow, step by step");
  const flatCrewFlow = flat(crewFlow);
  add(
    ID.crewFlow,
    crewFlow !== ""
      && /Every numbered step below belongs to the `crew` route/i.test(flatCrewFlow)
      && /`solo`\s+(?:otherwise\s+)?runs only\s+the five bullets/i.test(flatCrewFlow)
      && /borrowed: `solo` uses step 9's briefing list/i.test(flatCrewFlow)
      && /step 11's\s+commit/i.test(flatCrewFlow)
      && /`solo` starts only its one engineer plus the\s+single reviewer step 1 named/i.test(flatCrewFlow),
    crewFlow === ""
      ? "the numbered flow no longer has a heading saying whose flow it is"
      : `the numbered flow does not say it is the \`crew\` route's, which two steps \`solo\` borrows, and what \`solo\` may start: ${JSON.stringify(flatCrewFlow.slice(0, 400))}`,
  );

  // --- the hard-rules bullet that restates the PRD rule -------------------
  //
  // The paragraph is what is judged, not a window after the phrase: the scoping
  // word ("On the `crew` route,") stands BEFORE "open with a PRD of their own",
  // so a window that starts at the phrase would report a scoped rule as unscoped.
  const prdParagraph = units(text).find((block) => block.includes("open with a PRD of their own")) ?? "";
  add(
    ID.prdBullet,
    prdParagraph !== "" && /`crew` route/.test(prdParagraph) && /opens no PRD/i.test(prdParagraph),
    prdParagraph === ""
      ? 'nothing in roles/pm.md says "open with a PRD of their own" any more, so the scoped restatement is missing'
      : `the bullet restating the PRD rule does not keep it on the \`crew\` route and exempt \`solo\`: ${JSON.stringify(prdParagraph.slice(0, 300))}`,
  );

  // --- the general scan ----------------------------------------------------
  const offenders = units(text)
    .filter((block) => claimsEveryChange(block) && REQUIRED_ARTIFACT.test(block) && !NAMES_A_ROUTE.test(block));
  add(
    ID.quantifier,
    offenders.length === 0,
    `${offenders.length} paragraph(s) claim something for every change without naming a route, so they override \`direct\`: `
      + JSON.stringify(offenders.map((block) => block.slice(0, 160))),
  );

  // --- the exact old wordings ---------------------------------------------
  for (const phrase of BANNED) {
    const needle = phrase.toLowerCase();
    const at = whole.toLowerCase().split(needle).length - 1;
    const byLine = text.toLowerCase().split("\n").filter((line) => line.includes(needle)).length;
    add(
      bannedId(phrase),
      at === 0,
      `${at} occurrence(s) flattened, ${byLine} line by line. This is one of the wordings that let a later rule `
        + "override step 1; a flattened count above the line-based one means the sentence wraps, and every line-based "
        + "grep for it is lying.",
    );
  }

  return results;
}

// ------------------------------------------- the contributor-facing copy

const CONTRIBUTING = "CONTRIBUTING.md";
const CONTRIB = {
  routes: `${CONTRIBUTING} carries the three-route table`,
  prd: `${CONTRIBUTING} scopes the PRD to the \`crew\` route`,
  decisions: `${CONTRIBUTING} scopes the ADR and the CRD to the routes that write them`,
  cap: `${CONTRIBUTING} states that 2 is the only value \`limits.reviewRounds\` takes`,
};
const contribBannedId = (phrase) => `the old wording ${JSON.stringify(phrase)} is gone from ${CONTRIBUTING}`;

/**
 * The same rule as `audit`, told to a contributor. The shape is checked rather
 * than the prose: a three-route table with one row per route, a PRD paragraph
 * that names the route it belongs to, and the ceiling stated as one.
 */
function auditContributing(text) {
  const results = [];
  const add = (id, ok, detail = "") => results.push({ id, ok, detail });
  const whole = flat(text);

  add(
    CONTRIB.routes,
    /## The three routes/.test(text)
      && ["| `direct` |", "| `solo` |", "| `crew` |"].every((row) => text.includes(row)),
    "CONTRIBUTING.md does not lay the three routes out one per row, so a contributor reads one flow for every change",
  );

  const prdParagraph = units(text).find((block) => block.includes("each job opens with a PRD of its own")) ?? "";
  add(
    CONTRIB.prd,
    prdParagraph !== "" && /`crew` route/.test(prdParagraph) && /`solo` opens no PRD/i.test(prdParagraph),
    prdParagraph === ""
      ? `nothing in ${CONTRIBUTING} says "each job opens with a PRD of its own" any more, so the scoped statement is missing`
      : `the PRD paragraph does not stay on the \`crew\` route: ${JSON.stringify(prdParagraph.slice(0, 300))}`,
  );

  // The contributor guide tells the same story about the two decision records:
  // they belong to the routes that write documents, and a `direct` change keeps
  // its choice in the commit message instead.
  const decisionsParagraph = units(text).find((block) => /goes into an ADR/i.test(block)) ?? "";
  add(
    CONTRIB.decisions,
    /`solo` and `crew` routes, a decision about \*\*how\*\*/i.test(whole)
      && /`direct`\s+change writes neither/i.test(whole),
    decisionsParagraph === ""
      ? `${CONTRIBUTING} no longer says where an ADR goes`
      : `the ADR/CRD paragraph does not scope the two records and exempt \`direct\`: ${JSON.stringify(decisionsParagraph.slice(0, 300))}`,
  );

  add(
    CONTRIB.cap,
    /`limits\.reviewRounds` is `2`, and 2 is the only value\s+it takes/i.test(whole),
    `${CONTRIBUTING} does not say that \`limits.reviewRounds\` is 2 and that 2 is the only value it takes, so a contributor can still read it as a number to raise or lower`,
  );

  for (const phrase of CONTRIBUTING_BANNED) {
    const at = whole.toLowerCase().split(phrase).length - 1;
    add(
      contribBannedId(phrase),
      at === 0,
      `${at} occurrence(s) flattened. This is one of the wordings that made every change look like a full ` +
        "`crew` job in the guide a contributor reads first.",
    );
  }

  return results;
}

// ------------------------------------------------- the four shipped documents
//
// Round two's first defect was a cross-file one, and no case could see it: the ADR
// section of `roles/pm.md` puts `solo` on the ADR routes, while `CLAUDE.md` and
// `principles.md` said neither `solo` nor `direct` writes an ADR or a CRD — and the
// `solo` flow's own paragraph said the work moves up to `crew` for it. Four
// documents, two answers, every one of them green.
//
// So the rule is judged across all four at once, in both directions:
//
//   * each document that states the ADR rule must put it on `solo` and `crew`,
//     with `direct` exempt — that is the contract this task's review settled;
//   * no document may claim that a `solo` change writes no ADR or no CRD.
//
// The negative half is the one that matters: a document can stay silent about
// `solo` and still contradict the others by denying it a record, which is exactly
// what happened twice.
const DOC_FILES = ["roles/pm.md", "CLAUDE.md", CONTRIBUTING, "principles.md"];
const DOC_IDS = {
  adrOnSoloAndCrew: (file) => `${file}: the ADR rule is on the \`solo\` and \`crew\` routes`,
  noSoloDenial: (file) => `${file}: does not deny \`solo\` a decision record`,
};
// The two shapes the denial took, and they are the only two it can take in a
// sentence about routes: "… or writes an ADR or a CRD." on the end of a sentence
// that started with "Neither `solo` nor `direct`", and a plain "a `solo` change
// writes no ADR". Both are judged inside one sentence (`[^.;]`), so the fixed
// sentence — "…; a `direct` change writes no ADR and no CRD, while `solo` writes
// one when a choice deserves its own record" — does not match either of them.
const SOLO_DENIED = [
  /or writes an adr or a crd/i,
  /`solo`[^.;]{0,60}\b(writes no|writes neither|writes none|gets no)\b[^.;]{0,30}(adr|crd)/i,
];

/**
 * Judge the ADR rule across the four documents that state it.
 * @param files - a map from repository path to that file's text
 */
function auditDocuments(files) {
  const results = [];
  const add = (id, ok, detail = "") => results.push({ id, ok, detail });

  for (const file of DOC_FILES) {
    const whole = flat(files[file] ?? "");
    add(
      DOC_IDS.adrOnSoloAndCrew(file),
      whole !== "" && /`solo` and `crew`/i.test(whole),
      `${file} does not put the ADR rule on the \`solo\` and \`crew\` routes: ${JSON.stringify(whole.slice(0, 200))}`,
    );
    const denied = SOLO_DENIED.map((pattern) => pattern.exec(whole)).find((found) => found !== null);
    add(
      DOC_IDS.noSoloDenial(file),
      whole !== "" && denied === undefined,
      `${file} denies \`solo\` a decision record, which the ADR section of roles/pm.md grants it: `
        + JSON.stringify(denied?.[0] ?? ""),
    );
  }

  return results;
}

// ------------------------------------------------------------- the real file

const text = pm();
const contributing = repoFile(CONTRIBUTING);
const documents = Object.fromEntries(DOC_FILES.map((file) => [file, file === "roles/pm.md" ? pmRules() : repoFile(file)]));
for (const phrase of BANNED) {
  const needle = phrase.toLowerCase();
  const at = flat(text).toLowerCase().split(needle).length - 1;
  const byLine = text.toLowerCase().split("\n").filter((line) => line.includes(needle)).length;
  console.log(`      ${JSON.stringify(phrase)} in roles/pm.md: ${at} flattened, ${byLine} line by line`);
}
console.log(`      the \`direct\` bullet is ${flat(directBullet(text)).length} char(s) of flattened text`);

for (const result of audit(text)) check(result.id, result.ok, result.detail);
for (const result of auditContributing(contributing)) check(result.id, result.ok, result.detail);
for (const result of auditDocuments(documents)) check(result.id, result.ok, result.detail);

// -------------------------------------------------------------- mutations

/** Break one file of a fresh copy and return which audit checks failed. */
function afterBreaking(breakIt) {
  const dir = tempRepo();
  try {
    breakIt(dir);
    return audit(composePmRulesIn(dir)).filter((result) => !result.ok).map((result) => result.id);
  } finally {
    cleanUp(dir);
  }
}

// `tempRepo()` copies the files the project's check scripts read, and
// `CONTRIBUTING.md` is not one of them, so this file's mutation is applied to the
// text itself. The audit is a pure function over text, so that is the same proof —
// and the check below refuses an edit that matched nothing, which is the failure
// mode a mutation that silently does not mutate would hide.
function mutateContributing(from, to) {
  const broken = contributing.replace(from, to);
  if (broken === contributing) throw new Error(`mutation anchor not found in ${CONTRIBUTING}: ${JSON.stringify(from)}`);
  return auditContributing(broken).filter((result) => !result.ok).map((result) => result.id);
}

// Mutation 1: the old opener comes back in front of the scoped bug rule.
const opener = afterBreaking((dir) => {
  edit(dir, "roles/playbooks/bug-rows.md", "**On those two routes, a bug gets a task row of its own", "**Whatever its size.** **On those two routes, a bug gets a task row of its own");
});
check(
  "mutation 1: putting the old \"Whatever its size.\" opener back turns this case red",
  opener.includes(bannedId("whatever its size.")),
  `failed checks were ${JSON.stringify(opener)}`,
);

// Mutation 2: the `direct` bullet loses one of its skips.
const lostSkip = afterBreaking((dir) => {
  edit(dir, "roles/pm.md", "no Socratic interview (step 2), no PRD, no HLD,", "no PRD, no HLD,");
});
check(
  "mutation 2: dropping a skip from the `direct` bullet turns this case red",
  lostSkip.includes(skipId("the Socratic interview, by step")),
  `failed checks were ${JSON.stringify(lostSkip)}`,
);

// Mutation 3: step 4 stops saying which route opens a PRD.
const unscopedStep4 = afterBreaking((dir) => {
  edit(dir, "roles/playbooks/crew-flow.md", "**This step is the `crew` route's opening document.** `solo` opens no PRD", "`solo` opens no PRD");
});
check(
  "mutation 3: un-scoping step 4 turns this case red",
  unscopedStep4.includes(ID.step4),
  `failed checks were ${JSON.stringify(unscopedStep4)}`,
);

// Mutation 4: the hard-rules bullet restates the PRD rule with no route on it.
const unscopedBullet = afterBreaking((dir) => {
  edit(dir, "roles/playbooks/hard-rules.md", "in any folder. On the `crew` route, small work and big work both open", "in any folder. Small work and big work both open");
});
check(
  "mutation 4: the hard-rules PRD bullet losing its `crew` scoping turns this case red",
  unscopedBullet.includes(ID.prdBullet) || unscopedBullet.includes(ID.quantifier),
  `failed checks were ${JSON.stringify(unscopedBullet)}`,
);

// Mutation 5: a NEW unconditional rule the banned list has never seen, so the
// general scan is doing real work instead of decorating the four anchors.
//
// V2: the bug section moved to `roles/playbooks/bug-rows.md`, so the new sentence
// is planted in front of it THERE — and read back through `composePmRulesIn`, so
// the planted rule really lands in the text the audit judges.
const freshRule = afterBreaking((dir) => {
  edit(
    dir,
    "roles/playbooks/bug-rows.md",
    "## A bug becomes a task row — on the `crew` and `solo` routes only",
    "Every change gets a task row in `docs/tasks/` before it starts.\n\n## A bug becomes a task row — on the `crew` and `solo` routes only",
  );
});
check(
  "mutation 5: a new \"every change gets a task row\" rule turns the general scan red",
  freshRule.includes(ID.quantifier),
  `failed checks were ${JSON.stringify(freshRule)} — a sentence that overrides \`direct\` in a wording the banned list `
    + "does not know about has to be caught by the scan, or the scan is only a second copy of that list",
);

// Mutation 7: the ADR section goes back to being a rule for every change — its
// heading loses the routes, which is exactly how it read before this task.
const adrHeadingBack = afterBreaking((dir) => {
  edit(
    dir,
    "roles/playbooks/decisions.md",
    "## Decisions about how: every one gets an ADR — on the `solo` and `crew` routes",
    "## Decisions about how: every one gets an ADR",
  );
});
check(
  "mutation 7: the ADR section heading losing its routes turns this case red",
  adrHeadingBack.includes(ID.adrHeading),
  `failed checks were ${JSON.stringify(adrHeadingBack)}`,
);

// Mutation 8: the ADR section keeps its heading and loses the paragraph that
// exempts `direct` and re-routes a decision that deserves a record.
const adrExemptionGone = afterBreaking((dir) => {
  edit(
    dir,
    "roles/playbooks/decisions.md",
    "**A `direct` change writes no ADR, and nothing here may be read as asking it\nfor one.**",
    "**A `direct` change writes one ADR, like everything else.**",
  );
});
check(
  "mutation 8: the ADR section losing its `direct` exemption turns this case red",
  adrExemptionGone.includes(ID.adrScoped),
  `failed checks were ${JSON.stringify(adrExemptionGone)}`,
);

// Mutation 9: the `direct` bullet forgets the two decision records, which is the
// shape the review round of this task was about: the route stops saying it writes
// no ADR and no CRD.
const adrSkipGone = afterBreaking((dir) => {
  edit(dir, "roles/pm.md", "no ADR, no CRD, no design document,", "");
});
check(
  "mutation 9: the `direct` bullet dropping its ADR and CRD skips turns this case red",
  adrSkipGone.includes(skipId("the ADR")) && adrSkipGone.includes(skipId("the CRD")),
  `failed checks were ${JSON.stringify(adrSkipGone)}`,
);

// Mutation 10: the `solo` flow goes back to refusing to record its own decisions
// and sending the work up to `crew` — the round-two defect, in one edit.
const soloAdrGone = afterBreaking((dir) => {
  edit(
    dir,
    "roles/pm.md",
    "A choice that\ndeserves its own record **is** `solo`'s business: you write that ADR yourself,\nbecause this route has no architect, and a change to a TaskBrief's acceptance list\nis written up as the CRD the section above describes.",
    "A decision big enough to deserve its own record moves the work up to\n`crew`, and a small implementation choice stays in the commit message.",
  );
});
check(
  "mutation 10: `solo` escalating its decision records turns this case red",
  soloAdrGone.includes(ID.soloAdr) && soloAdrGone.includes(bannedId("moves the work up to")),
  `failed checks were ${JSON.stringify(soloAdrGone)}`,
);

// Mutation 11: the two flows go back to saying `solo` starts no reviewer at all,
// which is what contradicted the routing decision table's `crew_security_reviewer`.
const soloReviewerGone = afterBreaking((dir) => {
  edit(dir, "roles/pm.md", "plus the single reviewer step\n  1 named if it named one, and nothing else", "and nothing else");
});
check(
  "mutation 11: `solo` losing its single named reviewer turns this case red",
  soloReviewerGone.includes(ID.soloReviewer) || soloReviewerGone.includes(bannedId("starts an architect, qa or a reviewer")),
  `failed checks were ${JSON.stringify(soloReviewerGone)}`,
);

// Mutation 12: one shipped document denies `solo` a decision record again. This is
// judged in memory: `tempRepo()` copies the files the project's check scripts read,
// and `CLAUDE.md` is not one of them, so there is no copy to edit — and the audit
// is a pure function over text, which makes it the same proof.
const claudeDenial = (() => {
  const broken = documents["CLAUDE.md"].replace(
    "keeps a milestone of its own; a `direct` change writes no ADR and no CRD, while `solo` writes one",
    "keeps a milestone of its own, or writes an ADR or a CRD",
  );
  if (broken === documents["CLAUDE.md"]) throw new Error("mutation anchor not found in CLAUDE.md");
  return auditDocuments({ ...documents, "CLAUDE.md": broken }).filter((result) => !result.ok).map((result) => result.id);
})();
check(
  "mutation 12: one document denying `solo` a decision record turns the cross-file check red",
  claudeDenial.includes(DOC_IDS.noSoloDenial("CLAUDE.md")),
  `failed checks were ${JSON.stringify(claudeDenial)} — four documents saying different things is the failure this `
    + "check exists for, and it has to red on the one that moved",
);

// Mutation 6: the contributor guide gets the old unconditional rule back.
const contribBack = mutateContributing(
  "Every change is a `team` job, and the PM picks the cheapest route",
  "Every change, whatever its size, is a `team` job, and the PM picks the cheapest route",
);
check(
  `mutation 6: the unconditional wording coming back into ${CONTRIBUTING} turns this case red`,
  contribBack.includes(contribBannedId("every change, whatever its size, is a `team` job")),
  `failed checks were ${JSON.stringify(contribBack)}`,
);

done();
