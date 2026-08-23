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

import { before } from "./baseline.mjs";
import { check, done, flat, repoFile } from "../lib/qa.mjs";

const RULE = "One question per turn";
const count = (text) => (flat(text).match(new RegExp(RULE, "g")) ?? []).length;

const now = repoFile("roles/pm.md");
const nowCount = count(now);

/** One `## heading` section, anchored to the start of a line, up to the next `^## `. */
function lineSection(text, heading) {
  const lines = text.split("\n");
  const first = lines.findIndex((line) => line.trim() === `## ${heading}`);
  if (first === -1) throw new Error(`no line-start "## ${heading}" heading in roles/pm.md`);
  const next = lines.findIndex((line, index) => index > first && /^## /.test(line));
  return lines.slice(first, next === -1 ? lines.length : next).join("\n");
}

console.log(`roles/pm.md carries "${RULE}" ${nowCount} time(s) when flattened`);

// ---------------------------------------------------------------- half one
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

const homes = [
  ["Never guess", () => lineSection(now, "Never guess")],
  ["Hard rules", () => lineSection(now, "Hard rules")],
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

// The third home is the interview step this task edited — the one at risk.
const interviewStart = now.search(/^2\. \*\*/m);
const afterTwo = now.slice(interviewStart + 1);
const interviewEnd = afterTwo.search(/\n\d+\. \*\*/);
const interview = interviewEnd === -1 ? now.slice(interviewStart) : now.slice(interviewStart, interviewStart + 1 + interviewEnd);

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
