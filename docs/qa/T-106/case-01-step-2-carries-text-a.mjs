// T-106 DoD item 1 (PRD M1 item 1): step 2 of the team lane — the interview —
// carries authoritative paragraph A word for word, so the PM judges every
// question for whether it can be skipped and offers "leave it undecided" only
// where it really can be.
//
// What it proves: the words are in the STEP the PM reads while it is
// interviewing, not merely somewhere in a 1900-line file. A rule about how to
// ask, sitting in the section about how to commit, is a rule nobody applies.
//
// NOT ONE VERIFICATION STRING IS HAND-TYPED HERE (`ADR 0027`). Every phrase this
// case demands is read out of paragraph A in `docs/design/tasks.md` at run time.
// The reason is a mistake this job already made once: the second security review
// rewrote A's skip condition — "you can start the work without its answer" was
// demoted from the standard to an example of what is NOT enough — and a
// hand-typed check then failed a prompt that had copied the new text correctly.
// A string typed here does not follow the paragraph; a string read from it does.
//
// What still IS hand-written, on purpose: which SPAN to look for, never the words
// inside it. That keeps the second line of defence the ADR wanted — comparing the
// whole paragraph catches drift between two files, but it cannot notice the
// paragraph itself being quietly softened, which is `docs/qa/gaps.md` item 59.
// Asserting that A still HAS a skip condition, an option and a refusal is a check
// on A, and the run prints every span so a softening is visible to a reader even
// where no assertion can catch it.
//
// What it does NOT prove: that a model reads the step and obeys it. That belongs
// to a person for ever.
//
// PINNING STYLE: FLATTENED, blockquote marker stripped from both sides. The
// paragraph is wrapped prose inside an indented numbered list, so it wraps
// differently in the task file and in the prompt — line-based grep finds nothing.

import { boldSpans, check, contract, done, quoteless } from "./contract.mjs";
import { pm, step } from "../lib/qa.mjs";

const A = contract("A");
const spans = boldSpans(A.text);
const prompt = pm();
const interview = step(prompt, 2);
const words = quoteless(interview);

console.log(`paragraph A: ${A.text.length} characters, read from ${A.source}`);
console.log(`step 2 of roles/pm.md: ${interview.length} characters over ${interview.split("\n").length} lines`);
console.log(`the load-bearing spans of A, as A itself marks them (${spans.length}):`);
for (const span of spans) console.log(`  • ${span}`);

check(
  "step 2 really is the interview step",
  /interview/i.test(interview.split("\n")[0]),
  `step 2 opens with: ${JSON.stringify(interview.split("\n")[0])} — the step numbering moved, so every assertion below is about the wrong step`,
);

check(
  "step 2 carries paragraph A word for word",
  words.includes(A.text),
  `the flattened step does not contain the flattened paragraph.\n      wanted: ${JSON.stringify(A.text)}`,
);

// ------------------------------------------- paragraph A still has its shape
// A check on the CANONICAL TEXT, not on the prompt. Comparing the two files
// catches them drifting apart; nothing catches them being softened together, so
// this asserts that A still states the three things it exists to state. It says
// nothing about the wording, which is free to change and does.

check(
  "paragraph A has not been reduced: it still marks at least four load-bearing spans",
  spans.length >= 4,
  `${spans.length} span(s) — A is a rule made of a condition, an option and a refusal; a paragraph with fewer has lost one`,
);

/** The single span matching a selector, or undefined. Selectors name a span, never its words. */
const spanFor = (name, pattern) => {
  const found = spans.filter((span) => pattern.test(span));
  check(
    `paragraph A still states ${name}`,
    found.length === 1,
    found.length === 0
      ? `no bold span of A matches ${pattern} — the rule has lost this half, and every prompt copying A faithfully has lost it too`
      : `${found.length} spans match ${pattern}: ${found.join(" | ")} — the selector is ambiguous`,
  );
  return found[0];
};

const parts = [
  ["the condition under which a question may be skipped", /^only when /i],
  ['the "leave it undecided" option', /leave it undecided/i],
  ["what a question that cannot be skipped gets instead", /gets no such option/i],
];

for (const [name, pattern] of parts) {
  const span = spanFor(name, pattern);
  if (span === undefined) continue;
  check(
    `step 2 carries it word for word: "${span}"`,
    words.includes(span),
    "this span is in the authoritative paragraph and not in the prompt — the copy has lost a load-bearing half",
  );
}

// The condition is the half this job rewrote, so it gets one more assertion: it
// must still be a CONDITION and not a suggestion. Shape, not wording.
const condition = spans.find((span) => /^only when /i.test(span));
if (condition) {
  check(
    "the skip condition is still written as a condition, not as advice",
    /^only when /i.test(condition) && condition.length > 30,
    `it reads ${JSON.stringify(condition)} — "only when …" is what makes this a test a PM can apply`,
  );
}

check(
  "and step 2 says what happens to a question that fails it",
  /cannot be skipped/i.test(words) && /why it cannot/i.test(words),
  "step 2 does not say what happens to a question that cannot be skipped — every question would then carry the option",
);

// Nowhere else. If the interview rule also sat in another step, two steps would
// be saying it and a later edit would fix one of them. The needle is read from A.
const elsewhere = [1, 3, 4, 5].filter((number) => {
  try { return condition !== undefined && quoteless(step(prompt, number)).includes(condition); } catch { return false; }
});

check(
  "no other early step repeats the skip condition",
  elsewhere.length === 0,
  `step(s) ${elsewhere.join(", ")} also carry it — two copies of one rule drift apart the first time one is edited`,
);

done();
