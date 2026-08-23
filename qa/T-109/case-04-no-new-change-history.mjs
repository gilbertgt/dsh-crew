// T-109 DoD item 4: this job added no change history to `CLAUDE.md` — no dates,
// no "job X changed this on day Y".
//
// What it proves: the rule pinned by case-03 was obeyed by the very edit that
// sits next to it. Writing "principle 22 was added on 2026-08-22 by the
// skip-and-split job" is the natural thing to do while making a change, and it is
// exactly what turns this file back into a change log.
//
// HOW IT IS MEASURED. Every line present today and absent at the job's start
// commit, minus the lines that are merely the SAME text re-wrapped — a paragraph
// re-broken across lines shows up as "added" in any line-based diff, and an
// existing date carried along with it is not a new date. So a line only counts as
// new content when its words are not in the old file at all.
//
// WHY THIS CASE CARRIES A REVERSE PROOF. The assertion is "zero hits", the one
// shape that also passes when nothing was read — shape 4 of
// `docs/decisions/adr/0023-a-check-can-be-dead-when-written.md`. The proof cannot
// be "the old file has a date", because it has none: the commit before this job
// (`a692409`, "CLAUDE.md stops being a change log") took every date out, and both
// versions now hold zero. So the proof is made by feeding a FABRICATED dated line
// through the very same pipeline the real lines go through, and requiring it to
// be caught. That tests the whole detection, not only the regular expression.
//
// WHAT WILL DATE THIS CASE, said plainly: the baseline is one fixed commit. A
// later job that adds a date to `CLAUDE.md` for a good reason will turn this red,
// and the answer then is to move the baseline, not to weaken the rule. It is
// recorded in `qa/gaps.md`.
//
// PINNING STYLE: LINE-BASED against the start commit, with a flattened
// containment test to forgive re-wrapping.

import { before } from "./baseline.mjs";
import { check, done, flat, repoFile } from "../lib/qa.mjs";

const DATE = /\b2026-\d/;

const now = repoFile("CLAUDE.md");
const was = before("CLAUDE.md");

check(
  "the job's start commit is readable, so this case has a BEFORE at all",
  was.ok,
  was.ok ? "" : was.why,
);

if (!was.ok) done();

const oldFlat = flat(was.text);
const oldLines = new Set(was.text.split("\n"));

/**
 * The lines of `text` that are new content against the start commit: present
 * now, absent then, and not merely the same words re-wrapped across different
 * line breaks (which any line-based diff reports as an addition).
 */
const newContent = (text) => text.split("\n")
  .filter((line) => line.trim() !== "")
  .filter((line) => !oldLines.has(line))
  .filter((line) => !oldFlat.includes(flat(line).trim()));

// ------------------------------------------------------------ reverse proof
// Both versions of CLAUDE.md hold zero dates today, so the old file cannot serve
// as the positive control. This does: one invented line, through the same
// pipeline, which MUST come out flagged.
const PLANT = "This rule was added on 2026-08-22 by the skip-and-split job.";
// Only the plant is looked for, never the COUNT of dated lines: when the real
// file has gone wrong the pipeline flags those too, and a count assertion would
// then fail here and hide the failure that matters below.
const caught = newContent(`${now}\n${PLANT}`).includes(PLANT);

console.log(`CLAUDE.md: ${was.text.length} characters at the start commit, ${now.length} now`);
console.log(`reverse proof — a planted dated line comes back flagged: ${caught ? "yes" : "NO"}`);

check(
  "the detection really catches a dated line, so a zero below is a fact and not an empty read",
  caught,
  `the planted line ${JSON.stringify(PLANT)} was not flagged`
    + " — the pipeline cannot see a date, so its verdict on the real lines means nothing",
);

// ---------------------------------------------------------- the added lines
const added = newContent(now);

console.log(`lines added by this job (after removing re-wrapped ones): ${added.length}`);
for (const line of added) console.log(`  + ${line}`);

check(
  "this job really did add lines, so the check below has something to look at",
  added.length > 0,
  "no added line found at all — either nothing was written, or the comparison is not seeing the change",
);

const dated = added.filter((line) => DATE.test(line));

check(
  "not one line this job added carries a date",
  dated.length === 0,
  `${dated.length} line(s) do:\n      ${dated.join("\n      ")}`
    + "\n      a date in this file is change history; it belongs in CHANGELOG.md and in the CRD or ADR behind the change",
);

// The other half of "change history": naming the job or the change that made the
// edit. A date is the common form; "this job", "renamed", "used to be" are the rest.
const HISTORY = /\b(used to be (?:called|named)|was renamed|this job (?:added|changed|renamed)|as of \w+ \d{4})\b/i;
const storied = added.filter((line) => HISTORY.test(line));

check(
  "and none of them tells the story of how something got this way",
  storied.length === 0,
  `${storied.length} line(s) do:\n      ${storied.join("\n      ")}`,
);

done();
