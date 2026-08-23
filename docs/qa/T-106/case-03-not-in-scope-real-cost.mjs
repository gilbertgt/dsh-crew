// T-106 DoD item 3 (PRD M1 item 4): the step that writes the opening document
// carries authoritative paragraph C word for word — "not in scope" may hold only
// an item with a real cost.
//
// What it proves: the prompt draws the line where the job decided it, at COST —
// finished work rebuilt, or something that cannot be undone — and says out loud
// that a thing the PM merely did not get to stays out of the list.
//
// What it does NOT prove: that the PM classifies a real item correctly. Telling
// "we would have to rebuild the parser" from "we did not get round to it" is a
// judgement, and no case can make it.
//
// PINNING STYLE: FLATTENED, blockquote marker stripped from both sides; the
// expected paragraph is READ from the task file, never typed here.

import { check, contract, done, quoteless } from "./contract.mjs";
import { pm, step } from "../lib/qa.mjs";

const C = contract("C");
const prompt = pm();
const words = quoteless(prompt);

console.log(`paragraph C: ${C.text.length} characters, read from ${C.source}`);

check(
  "roles/pm.md carries paragraph C word for word",
  words.includes(C.text),
  `the flattened prompt does not contain the flattened paragraph.\n      wanted: ${JSON.stringify(C.text)}`,
);

for (const phrase of ["has to be built again", "does not go in the list"]) {
  check(
    `roles/pm.md carries "${phrase}"`,
    words.includes(phrase),
    "one of the two phrases the DoD names by hand: the cost half, and the stay-out half",
  );
}

check(
  "it gives the undoable half of the cost by example, so the test is usable",
  /a package published/i.test(words) && /a tag pushed/i.test(words) && /data deleted/i.test(words),
  '"it cannot be undone" with no examples is a phrase, not a test',
);

check(
  "it says what putting the wrong thing in costs: a boundary the user has to overturn",
  /boundary the user has to overturn/i.test(words),
  "without this, the rule sounds like tidiness rather than a price the user pays",
);

// The paragraph has to be in the step that WRITES the document, next to the
// section it governs. Somewhere else in the file is not the same thing.
const numbers = [...prompt.matchAll(/^(\d+)\. \*\*/gm)].map((hit) => Number(hit[1]));
const carriers = numbers.filter((number) => quoteless(step(prompt, number)).includes(C.text));

check(
  "and it sits inside exactly one numbered step of the team lane",
  carriers.length === 1,
  carriers.length === 0
    ? "paragraph C is in the file but in no numbered step — the PM writing the document never walks past it"
    : `steps ${carriers.join(", ")} each carry it; one rule in two places drifts`,
);

if (carriers.length === 1) {
  const title = step(prompt, carriers[0]).split("\n")[0];
  console.log(`paragraph C lives in step ${carriers[0]}: ${title.trim()}`);
  check(
    `step ${carriers[0]} is the step that writes the opening document`,
    /opening document/i.test(title),
    `it is in step ${carriers[0]} instead, whose title is ${JSON.stringify(title.trim())}`,
  );
}

done();
