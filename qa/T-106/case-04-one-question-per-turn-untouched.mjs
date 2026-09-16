// T-106 DoD item 4: the "one question per turn" rule is untouched. It is written
// three times on purpose — in `## Never guess`, in the interview step, and in
// `## Hard rules` — and this task must not have cost the prompt any of them.
//
// What it proves: adding the skip rule to the interview did not push out, merge
// or reword the rule the interview already had. That is the ordinary way a prompt
// loses a rule: nobody deletes it, somebody rewrites the paragraph around it.
//
// Two independent halves, because either alone is weak:
//   1. against the job's START COMMIT — the count did not drop. Catches a
//      deletion the moment it happens, and needs no wording typed here.
//   2. against the THREE SECTIONS by name — each one still carries it. Survives
//      the day the start commit stops being reachable, and is the half that says
//      WHICH copy went.
//
// What it does NOT prove: that the three copies still say the same thing. They
// are worded differently on purpose (a heading, a step, a one-line rule), so no
// case can compare them.
//
// PINNING STYLE: FLATTENED. The interview copy wraps mid-phrase ("**One question
// per\n   turn.**"), so a line-based `grep -c` sees 2 where the flattened text
// sees 3 — the DoD's own command flattens first for this reason.
//
// WHICH FILES THIS READS (Crew V2). The COUNT is still taken over the rules the
// package ships, which `pmRules()` composes from the always-loaded core plus every
// playbook — a rule that moved into a playbook still ships, so the count keeps
// meaning what it always meant. The THREE HOMES are a different question: each one
// asks whether that particular place still states the rule, so each one reads the
// file that place lives in now. Two of the three moved out of `roles/pm.md`:
// `## Hard rules` is `roles/playbooks/hard-rules.md`, and the step-2 interview is
// `roles/playbooks/crew-flow.md`. Reading `pmRules()` for those two would be wrong
// in a way that hides itself: the composed text does still contain the rule (in
// the playbooks), but the core's own shorter `## Hard rules` list comes first in
// that text and carries no copy — so a line-section read of the composition finds
// the core's list, sees no copy in it, and reports a rule gone that is really
// there. `## Never guess` did not move and is still read from the core.

import { before } from "./baseline.mjs";
import { check, done, flat, pmCore, pmRules, rulesFile } from "../lib/qa.mjs";

const RULE = "One question per turn";
const count = (text) => (flat(text).match(new RegExp(RULE, "g")) ?? []).length;

const now = pmRules();
const nowCount = count(now);

/** One `## heading` section, anchored to the start of a line, up to the next `^## `. */
function lineSection(text, heading) {
  const lines = text.split("\n");
  const first = lines.findIndex((line) => line.trim() === `## ${heading}`);
  if (first === -1) throw new Error(`no line-start "## ${heading}" heading in the text this case was given`);
  const next = lines.findIndex((line, index) => index > first && /^## /.test(line));
  return lines.slice(first, next === -1 ? lines.length : next).join("\n");
}

console.log(`the PM rules carry "${RULE}" ${nowCount} time(s) when flattened`);

// ---------------------------------------------------------------- half one
//
// The BEFORE is the start commit's `roles/pm.md`, because at that commit the whole
// prompt was still one file. The NOW is the composed rules, which is that same set
// of rules after V2 split it. Comparing the two is still the comparison this half
// was written for — "this task was allowed to add wording, never to take a copy
// away" — and it is why the count, not the file, is what is pinned.
const was = before("roles/pm.md");

check(
  "the job's start commit is readable, so this case has a BEFORE at all",
  was.ok,
  was.ok ? "" : was.why,
);

if (was.ok) {
  const wasCount = count(was.text);
  console.log(`at the start commit it carried it ${wasCount} time(s)`);
  check(
    "the count did not drop against the start commit",
    nowCount >= wasCount,
    `${wasCount} before, ${nowCount} now — this task was allowed to add wording, never to take a copy of this rule away`,
  );
}

// ---------------------------------------------------------------- half two
check(
  "it is still written at least three times",
  nowCount >= 3,
  `${nowCount} copies — the prompt says this rule three times on purpose, in three places a PM reads at three different moments`,
);

// Each home is read from the file that home lives in after V2. The two names are
// the ones `roles/pm.md`'s own playbook index gives the PM.
const HARD_RULES_PLAYBOOK = "roles/playbooks/hard-rules.md";
const CREW_FLOW_PLAYBOOK = "roles/playbooks/crew-flow.md";

const homes = [
  ["Never guess", () => lineSection(pmCore(), "Never guess")],
  ["Full hard-rule reference", () => lineSection(rulesFile(HARD_RULES_PLAYBOOK), "Full hard-rule reference")],
];

for (const [heading, slice] of homes) {
  let section;
  try { section = slice(); } catch (error) { section = ""; console.error(`      ${error.message}`); }
  check(
    `\`## ${heading}\` still carries it`,
    count(section) >= 1,
    `the copy in "${heading}" is gone; a PM meeting that section alone would not know the rule`,
  );
}

// The third home is the interview step this task edited — the one at risk. It is
// step 2 of the `crew` flow, which V2 moved into `crew-flow.md`, so it is read
// there. Searching the composed text for the first `2. **` happens to land on the
// same step today, but only because the core's step 1 has no numbered sub-step: a
// read that names the file cannot drift when that changes.
const flow = rulesFile(CREW_FLOW_PLAYBOOK);
const interviewStart = flow.search(/^2\. \*\*/m);
const afterTwo = flow.slice(interviewStart + 1);
const interviewEnd = afterTwo.search(/\n\d+\. \*\*/);
const interview = interviewStart === -1
  ? ""
  : (interviewEnd === -1 ? flow.slice(interviewStart) : flow.slice(interviewStart, interviewStart + 1 + interviewEnd));

check(
  "the interview step — the step this task edited — still carries it",
  count(interview) >= 1,
  "the copy inside step 2 is gone: the new skip rule was added to that step, and it took the old rule with it",
);

// A negative check with a positive twin, so a typo in the pattern cannot pass as
// a clean result: the rule the old wording named must still NOT be back.
check(
  "the reader is told to wait for the answer, not merely to ask one thing",
  /wait for the answer/i.test(flat(now)),
  "one question per turn without waiting is two questions in two turns",
);

done();
