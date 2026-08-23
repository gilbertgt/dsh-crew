// T-107 DoD item 6: the sentence naming what principle 22 adds no longer leaves
// out the three rules this job put into it.
//
// What it proves: the one sentence in the file that tells a reader what principle
// 22 contains is true. It is an EXHAUSTIVE claim — "What principle 22 adds IS the
// six kinds, the funnel, …", not "includes" — so every rule added to the
// principle without being added here makes it false, and a reader who trusts it
// stops looking before reaching the three rules the whole job is about.
//
// WHY THIS IS ITS OWN CASE AND NOT PART OF `case-04` (`ADR 0028`). This sentence
// used to fall inside case-04's byte-for-byte slice, which protects DoD item 4's
// four blocks. It is not one of those four. The result was a check that went red
// when the sentence was correctly fixed, so a case whose only source was DoD item
// 4 was quietly demanding something no DoD asked for. The rule that came out of
// it: a check may pin no more than its own DoD cell protects, and a paragraph
// that deserves protection gets a DoD cell FIRST and a check second. This case is
// that order — item 6 exists, so this case exists.
//
// What it does NOT prove: that the sentence reads well, or that "the three rules
// below" is the clearest way to name them. A doc reviewer judges that.
//
// PINNING STYLE: FLATTENED and sliced to the ONE paragraph, so a mention of the
// stop rule anywhere else in a 200-line principle cannot answer for it. Deliberately
// NOT byte-for-byte: this sentence must be free to grow the next time principle 22
// does, which is the whole lesson above.

import { check, done, flat, repoFile } from "../lib/qa.mjs";

function principle(text, number) {
  const lines = text.split("\n");
  const first = lines.findIndex((line) => new RegExp(`^## ${number}\\. `).test(line));
  if (first === -1) throw new Error(`no "## ${number}. " heading`);
  const next = lines.findIndex((line, index) => index > first && /^## /.test(line));
  return lines.slice(first, next === -1 ? lines.length : next).join("\n");
}

const paragraphs = (text) => text.split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean);

const twentyTwo = principle(repoFile("principles.md"), 22);
const carriers = paragraphs(twentyTwo).filter((block) => /What principle 22 adds/i.test(flat(block)));

check(
  "exactly one paragraph of principle 22 says what principle 22 adds",
  carriers.length === 1,
  carriers.length === 0
    ? "no paragraph makes the claim at all — a reader has nothing telling them what this principle contains"
    : `${carriers.length} paragraphs make it, so two lists can disagree and a reader cannot tell which is current`,
);

const paragraph = flat(carriers[0] ?? "");

console.log(`the sentence, as it stands:\n  ${paragraph}\n`);

// --------------------------------------------------- the four it always had
for (const [name, pattern] of [
  ["the six kinds", /six\s+kinds/i],
  ["the funnel", /\bfunnel\b/i],
  ["the two failure modes", /two failure modes/i],
  ["the stop rule", /stop rule/i],
]) {
  check(
    `the list still names ${name}`,
    pattern.test(paragraph),
    "a block that IS part of principle 22 is missing from the one sentence that lists its parts",
  );
}

// ------------------------------------------------- the three this job added
check(
  "and it now also names the three rules this job added",
  /three rules/i.test(paragraph),
  "the claim is exhaustive and the three new rules are not in it, so the sentence is false"
    + " — this is exactly what DoD item 6 was added to fix",
);

check(
  "it says what those three rules are about, not merely that there are three",
  /interview must not leave behind|must not leave behind/i.test(paragraph),
  '"and three more rules" tells a reader a count and nothing else; they still cannot tell whether they have read them',
);

// The claim is exhaustive by construction, so the count in the sentence and the
// number of rules quoted in the principle have to agree. The quoted rules are the
// blockquote paragraphs of principle 22 — A, B and C.
const quoted = paragraphs(twentyTwo).filter((block) => block.split("\n").every((line) => line.trimStart().startsWith(">")));

console.log(`principle 22 quotes ${quoted.length} authoritative paragraph(s) as blockquotes`);

check(
  "the count the sentence gives matches how many rules the principle actually quotes",
  quoted.length === 3,
  `the sentence says three, the principle quotes ${quoted.length}`
    + " — an exhaustive claim with the wrong number is the same failure as before, one round later",
);

// -------------------------------------------------------- what must survive
check(
  "the paragraph still says the two older rules are untouched",
  /stay exactly as they are/i.test(paragraph) && /one question per turn/i.test(paragraph) && /never guess/i.test(paragraph),
  "the paragraph's other job — saying that one-question-per-turn and never-guess did NOT change — is gone",
);

check(
  "and it still records the wording that was deliberately dropped, with the reason",
  /Stop when the answers are settled/i.test(paragraph) && /names no condition anybody can check/i.test(paragraph),
  "the reason the old stop rule was replaced is gone, and the next person proposes it again",
);

done();
