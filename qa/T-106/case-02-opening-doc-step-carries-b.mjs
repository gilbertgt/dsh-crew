// T-106 DoD item 2 (PRD M1 items 2 and 3): the step that writes the opening
// document carries authoritative paragraph B word for word — a question the user
// left undecided is written NOWHERE — and it names all three places it must not
// be written: the table of what the interview settled, "not in scope", and
// "still undecided".
//
// What it proves: the rule sits in the step that produces the document, and the
// three places are named one by one. Naming them matters more than it looks:
// "write it nowhere" with no list reads as advice, and "still undecided" is the
// place a PM would otherwise reach for, because it feels like the honest one.
//
// What it does NOT prove: that a PRD written next month really leaves the
// question out. Nothing here can reach a document that does not exist yet.
//
// PINNING STYLE: FLATTENED, blockquote marker stripped from both sides; the
// expected paragraph is READ from the task file, never typed here.

import { check, contract, done, quoteless } from "./contract.mjs";
import { pm, step } from "../lib/qa.mjs";

const B = contract("B");
const prompt = pm();

// Find the step by what it DOES, not by its number: a step inserted above it
// would silently move it, and a hard-coded 4 would then test the wrong step.
const numbers = [...prompt.matchAll(/^(\d+)\. \*\*/gm)].map((hit) => Number(hit[1]));
const writers = numbers.filter((number) => /opening document/i.test(step(prompt, number).split("\n")[0]));

console.log(`paragraph B: ${B.text.length} characters, read from ${B.source}`);
console.log(`roles/pm.md has steps ${numbers.join(", ")}; step(s) whose title names the opening document: ${writers.join(", ") || "none"}`);

check(
  "exactly one step is the one that writes the opening document",
  writers.length === 1,
  writers.length === 0
    ? "no step title names the opening document — the step this DoD item is about cannot be found"
    : `${writers.length} steps claim it, so the rule could be in either and a reader would follow the wrong one`,
);

const number = writers[0] ?? 4;
const words = quoteless(step(prompt, number));

check(
  `step ${number} carries paragraph B word for word`,
  words.includes(B.text),
  `the flattened step does not contain the flattened paragraph.\n      wanted: ${JSON.stringify(B.text)}`,
);

// The three places, each named on its own. A failure here says which one went.
for (const [place, needle] of [
  ["the table of what the interview settled", "table of what the interview settled"],
  ['"not in scope"', '"not in scope"'],
  ['"still undecided"', '"still undecided"'],
]) {
  check(
    `step ${number} names ${place} as a place it must not be written`,
    words.includes(needle),
    `a skipped question would have a home in this one, and a home is a confirmed line`,
  );
}

check(
  `step ${number} says what "still undecided" IS for, not only what it is not`,
  /must be made at a known later point/i.test(words),
  'without the positive half, "still undecided" reads as a section with no purpose and the next PM fills it with anything',
);

check(
  `step ${number} says why: it becomes a confirmed line and asking later becomes a change of scope`,
  /confirmed line/i.test(words) && /change\s+of\s+scope/i.test(words),
  "a rule with no reason gets dropped the first time it is inconvenient",
);

done();
