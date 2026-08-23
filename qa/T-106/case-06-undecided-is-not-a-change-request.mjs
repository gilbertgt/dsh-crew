// T-106 DoD item 6: the "Not a change request" list in `## Change requests` gains
// the skipped question — it was written down nowhere, so asking for it later
// overturns no confirmed line and needs no CRD — together with the limit that
// keeps the exemption narrow: if saying yes would move the milestone list, a DoD
// section or the scope, principle 14 applies again.
//
// What it proves: the exemption is written where a PM goes to decide whether
// something is a change request. That placement is the whole item. The rule
// already lives in the interview step and in the step that writes the opening
// document, but a PM three weeks later is not re-reading those — it is reading
// the CRD section, and a list of exemptions that does not name this one sends it
// to write the CRD the whole job exists to avoid.
//
// The limit is not decoration. An exemption whose reason is "it was never written
// down" stops applying the moment saying yes would move something that WAS
// written down, and a reader who takes the exemption without it has been handed a
// way to skip principle 14 for real work.
//
// What it does NOT prove: that a PM classifies a real request correctly.
//
// PINNING STYLE: FLATTENED (the section is wrapped prose) and sliced to the
// `## Change requests` section, so a sentence in the interview step cannot answer
// for a sentence that has to be in the CRD section.

import { check, done, flat, pm } from "../lib/qa.mjs";

/** One `## heading …` section, anchored to the start of a line, up to the next `^## `. */
function lineSection(text, startsWith) {
  const lines = text.split("\n");
  const first = lines.findIndex((line) => line.startsWith(`## ${startsWith}`));
  if (first === -1) throw new Error(`roles/pm.md has no line-start "## ${startsWith}…" heading`);
  const next = lines.findIndex((line, index) => index > first && /^## /.test(line));
  return lines.slice(first, next === -1 ? lines.length : next).join("\n");
}

const prompt = pm();
const section = lineSection(prompt, "Change requests");
const words = flat(section);

console.log(`\`## Change requests\`: ${section.length} characters over ${section.split("\n").length} lines`);

check(
  "the section was not gutted",
  section.length >= 1500,
  `${section.length} characters — the slice found a stub, so every assertion below would be about nothing`,
);

check(
  "it still carries the list of things that are NOT a change request",
  /Not a change request:/i.test(words),
  "the list this item adds to is gone, so the new sentence has no home and the reader has no list to check against",
);

// --------------------------------------------------------- the new exemption
check(
  "a question left undecided in the interview is named as not a change request",
  /left undecided in the interview is not a change\s*request/i.test(words),
  "the exemption is not in the CRD section: a PM deciding whether to write a CRD reads this section, not the interview step",
);

check(
  "it gives the reason the exemption rests on: it was written down nowhere",
  /written down nowhere/i.test(words),
  "an exemption with no reason is a hole; the reason is also exactly what limits it",
);

check(
  "and it says what follows: no confirmed line is overturned, so no CRD",
  /overturns no confirmed line/i.test(words) && /needs no CRD/i.test(words),
  "without the consequence the reader still has to work out whether to write the CRD",
);

// ------------------------------------------------------------- the limit
check(
  "the exemption carries its limit: principle 14 still applies",
  /principle 14 still applies/i.test(words),
  "an exemption with no limit is a way to skip principle 14 for real work — this is the sentence that stops it",
);

check(
  "the limit names all three things that bring principle 14 back",
  /milestone list/i.test(words) && /DoD section/i.test(words) && /\bscope\b/i.test(words),
  "the limit has to be checkable: the milestone list, a DoD section, or the scope",
);

check(
  "the reason and the limit are in the SAME paragraph",
  (() => {
    const paragraph = section.split(/\n\s*\n/).find((block) => /left undecided in the interview is not a change\s*request/i.test(flat(block)));
    return paragraph !== undefined && /principle 14 still applies/i.test(flat(paragraph));
  })(),
  "the exemption and its limit are in different paragraphs — a reader who stops at the exemption never meets the limit",
);

check(
  "it says the exemption is narrow, in so many words",
  /it is narrow/i.test(words),
  "a reader skimming a list of exemptions needs to be told which way this one leans before they apply it",
);

// The list this joins must not have lost anything to make room.
for (const [what, pattern] of [
  ["a question the files can answer", /question the files can answer/i],
  ["a review finding about code", /review finding about code/i],
  ["an internal design change", /internal design change/i],
  ["the ADR-overturned-at-a-milestone exception", /overturns an ADR's recommended option/i],
]) {
  check(
    `the list still carries ${what}`,
    pattern.test(words),
    "an entry of the exemption list went missing while this one was added",
  );
}

done();
