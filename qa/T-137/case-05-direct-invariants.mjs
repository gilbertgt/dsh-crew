// T-137 DoD item 6 — no rule in the PM prompt may quietly add work to a `direct`
// change, and the contributor-facing copy in `CONTRIBUTING.md` has to say the
// same three routes.
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
// So this case judges the whole prompt, not one section, and it does it three
// ways:
//
//   1. the `direct` bullet must name every skip it makes;
//   2. every section that states one of those rules must name the routes it
//      applies to — the bug section, step 2, step 4, and the hard-rules bullet;
//   3. a general scan: no paragraph may pair a whole-job quantifier ("every
//      change", "every job", "whatever its size", "no exception") with a required
//      artifact (a PRD, a task row, an interview, a QA case, a review round)
//      unless that same paragraph names a route. That is the part that catches a
//      NEW sentence, not only the four that were here.
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
// Six mutations put the old text back, one piece at a time, and demand the run go
// red: the banned opener, a missing skip in the `direct` bullet, step 4's scoping
// sentence, the hard-rules bullet's `crew` scoping, a NEW unconditional rule the
// banned list has never seen, and the contributor guide's old wording.
//
// Reads `roles/pm.md` and `CONTRIBUTING.md`; writes only inside throwaway copies,
// which it removes.

import { check, cleanUp, copyFile, done, edit, flat, pm, repoFile, step, tempRepo } from "../lib/qa.mjs";

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
const BANNED = [
  "whatever its size.",
  "there is no longer a lane that skips it",
  "a bug is a task like any other task",
  "each of them is a bug with a task row of its own",
];

// What the `direct` bullet has to say it skips. Seven, one per thing the route
// must not grow back.
const REQUIRED_SKIPS = [
  ["no child role", /start \*\*no\*\* child role/i],
  ["the Socratic interview, by step", /Socratic interview \(step 2\)/i],
  ["the PRD", /no PRD\b/i],
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
const REQUIRED_ARTIFACT = /\b(PRD|opening document|task rows?|interview|QA case|review round|reviews)\b/i;
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

/** Every blank-line-separated paragraph, flattened. */
const paragraphs = (text) => text.split(/\n\s*\n/).map((block) => flat(block)).filter((block) => block !== "");

// ----------------------------------------------------------------- the audit

const ID = {
  lane: `roles/pm.md still has a "## ${LANE}" section`,
  direct: "the `direct` bullet can be sliced out of step 1",
  bugHeading: "the bug section's heading names the routes it applies to",
  bugScoped: "the bug section scopes its task-row rule and exempts `direct`",
  step2: "step 2 names the route it runs on",
  step4: "step 4 names the route that opens a PRD",
  prdBullet: "the hard-rules PRD bullet is scoped to the `crew` route",
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
    /runs on the `crew` route/i.test(two) && /`direct` skips it/i.test(two),
    `step 2 does not say it runs on the \`crew\` route and is skipped on \`direct\`: ${JSON.stringify(two.slice(0, 300))}`,
  );
  add(
    ID.step4,
    /runs on the `crew` route/i.test(four) && /`solo` opens no PRD/i.test(four) && /`direct` writes no document/i.test(four),
    `step 4 does not scope the PRD to the \`crew\` route and name \`solo\`/\`direct\` as the routes without one: ${JSON.stringify(four.slice(0, 300))}`,
  );

  // --- the hard-rules bullet that restates the PRD rule -------------------
  //
  // The paragraph is what is judged, not a window after the phrase: the scoping
  // word ("On the `crew` route,") stands BEFORE "open with a PRD of their own",
  // so a window that starts at the phrase would report a scoped rule as unscoped.
  const prdParagraph = paragraphs(text).find((block) => block.includes("open with a PRD of their own")) ?? "";
  add(
    ID.prdBullet,
    prdParagraph !== "" && /`crew` route/.test(prdParagraph) && /opens no PRD/i.test(prdParagraph),
    prdParagraph === ""
      ? 'nothing in roles/pm.md says "open with a PRD of their own" any more, so the scoped restatement is missing'
      : `the bullet restating the PRD rule does not keep it on the \`crew\` route and exempt \`solo\`: ${JSON.stringify(prdParagraph.slice(0, 300))}`,
  );

  // --- the general scan ----------------------------------------------------
  const offenders = paragraphs(text)
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
      `${at} occurrence(s) flattened, ${byLine} line by line. This is one of the four wordings that let a later rule `
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
  cap: `${CONTRIBUTING} states that the round limit is a hard ceiling`,
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

  const prdParagraph = paragraphs(text).find((block) => block.includes("each job opens with a PRD of its own")) ?? "";
  add(
    CONTRIB.prd,
    prdParagraph !== "" && /`crew` route/.test(prdParagraph) && /`solo` opens no PRD/i.test(prdParagraph),
    prdParagraph === ""
      ? `nothing in ${CONTRIBUTING} says "each job opens with a PRD of its own" any more, so the scoped statement is missing`
      : `the PRD paragraph does not stay on the \`crew\` route: ${JSON.stringify(prdParagraph.slice(0, 300))}`,
  );

  add(
    CONTRIB.cap,
    /`limits\.reviewRounds` is `2` and it is a hard ceiling/i.test(whole),
    `${CONTRIBUTING} does not say that \`limits.reviewRounds\` is 2 and a hard ceiling, so a contributor can still read it as a value to raise`,
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

// ------------------------------------------------------------- the real file

const text = pm();
const contributing = repoFile(CONTRIBUTING);
for (const phrase of BANNED) {
  const needle = phrase.toLowerCase();
  const at = flat(text).toLowerCase().split(needle).length - 1;
  const byLine = text.toLowerCase().split("\n").filter((line) => line.includes(needle)).length;
  console.log(`      ${JSON.stringify(phrase)} in roles/pm.md: ${at} flattened, ${byLine} line by line`);
}
console.log(`      the \`direct\` bullet is ${flat(directBullet(text)).length} char(s) of flattened text`);

for (const result of audit(text)) check(result.id, result.ok, result.detail);
for (const result of auditContributing(contributing)) check(result.id, result.ok, result.detail);

// -------------------------------------------------------------- mutations

/** Break one file of a fresh copy and return which audit checks failed. */
function afterBreaking(breakIt) {
  const dir = tempRepo();
  try {
    breakIt(dir);
    return audit(copyFile(dir, "roles/pm.md")).filter((result) => !result.ok).map((result) => result.id);
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
  edit(dir, "roles/pm.md", "**On those two routes, a bug gets a task row of its own", "**Whatever its size.** **On those two routes, a bug gets a task row of its own");
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
  edit(dir, "roles/pm.md", "**This step runs on the `crew` route.** `solo` opens no PRD", "`solo` opens no PRD");
});
check(
  "mutation 3: un-scoping step 4 turns this case red",
  unscopedStep4.includes(ID.step4),
  `failed checks were ${JSON.stringify(unscopedStep4)}`,
);

// Mutation 4: the hard-rules bullet restates the PRD rule with no route on it.
const unscopedBullet = afterBreaking((dir) => {
  edit(dir, "roles/pm.md", "in any folder. On the `crew` route, small work and big work both open", "in any folder. Small work and big work both open");
});
check(
  "mutation 4: the hard-rules PRD bullet losing its `crew` scoping turns this case red",
  unscopedBullet.includes(ID.prdBullet) || unscopedBullet.includes(ID.quantifier),
  `failed checks were ${JSON.stringify(unscopedBullet)}`,
);

// Mutation 5: a NEW unconditional rule the banned list has never seen, so the
// general scan is doing real work instead of decorating the four anchors.
const freshRule = afterBreaking((dir) => {
  edit(
    dir,
    "roles/pm.md",
    "## A bug becomes a task row",
    "Every change gets a task row in `docs/tasks/` before it starts.\n\n## A bug becomes a task row",
  );
});
check(
  "mutation 5: a new \"every change gets a task row\" rule turns the general scan red",
  freshRule.includes(ID.quantifier),
  `failed checks were ${JSON.stringify(freshRule)} — a sentence that overrides \`direct\` in a wording the banned list `
    + "does not know about has to be caught by the scan, or the scan is only a second copy of that list",
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
