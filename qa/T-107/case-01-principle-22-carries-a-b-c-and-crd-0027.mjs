// T-107 DoD items 1 and 3 (PRD M1 item 5): principle 22 quotes all three
// authoritative paragraphs word for word, and carries the reason they exist —
// `CRD 0027`, whose real cost was one command, no rework and no new work, and
// which still needed a full change request.
//
// What it proves: `principles.md` is where a rule's REASON lives (role prompts
// are written short and bossy on purpose), so a rule that reached `roles/pm.md`
// with no entry here is a rule the next person will quietly rewrite. The quoted
// paragraphs make this file the authority the other three tasks point back at,
// and the evidence makes the rule arguable rather than arbitrary.
//
// What it does NOT prove: that the reason is a good one, or that the evidence is
// told honestly. A doc reviewer reads that.
//
// PINNING STYLE: FLATTENED, blockquote marker stripped from both sides, and
// sliced to principle 22 alone — so a phrase living in principle 14 or in the
// closing sections cannot answer for it. The three paragraphs are READ from the
// task file, never typed here.

import { check, contract, done, quoteless } from "./contract.mjs";
import { repoFile } from "../lib/qa.mjs";

/** One `## <n>. …` principle, from its heading to the next `^## `. */
function principle(text, number) {
  const lines = text.split("\n");
  const first = lines.findIndex((line) => new RegExp(`^## ${number}\\. `).test(line));
  if (first === -1) throw new Error(`principles.md has no "## ${number}. " heading`);
  const next = lines.findIndex((line, index) => index > first && /^## /.test(line));
  return lines.slice(first, next === -1 ? lines.length : next).join("\n");
}

const text = repoFile("principles.md");
const twentyTwo = principle(text, 22);
const words = quoteless(twentyTwo);

console.log(`principle 22: ${twentyTwo.length} characters over ${twentyTwo.split("\n").length} lines`);
console.log(`(baseline on 2026-08-22: 14313 characters over 205 lines)`);

check(
  "principle 22 was not gutted",
  twentyTwo.length >= 6000,
  `${twentyTwo.length} characters, floor 6000 — the slice found a stub, so every assertion below would be about nothing`,
);

check(
  "the slice stops at the next principle",
  twentyTwo.split("\n").filter((line) => /^## /.test(line)).length === 1,
  "the slice swallowed a second `## ` heading, so a later section could answer these assertions",
);

// --------------------------------------------- the three paragraphs, verbatim
for (const letter of ["A", "B", "C"]) {
  const paragraph = contract(letter);
  check(
    `principle 22 quotes paragraph ${letter} word for word (${paragraph.text.length} characters, from ${paragraph.source})`,
    words.includes(paragraph.text),
    `the flattened principle does not contain it.\n      wanted: ${JSON.stringify(paragraph.text)}`,
  );
}

check(
  "and it says the role prompt carries that wording word for word",
  /word for word/i.test(words) && /roles\/pm\.md/.test(words),
  "without this, a reader cannot tell that the quoted paragraphs are a contract with another file rather than a paraphrase",
);

// ------------------------------------------------------------- the evidence
check(
  "principle 22 names `CRD 0027`",
  /CRD 0027/.test(words),
  "the rule loses the one worked example that shows what it costs to get this wrong",
);

check(
  "it says what CRD 0027 really cost: one command, no rework, no new work",
  /one command/i.test(words) && /no rework/i.test(words) && /no new work/i.test(words),
  "naming the CRD without its price makes it a citation instead of evidence — the whole point is that the price was nothing and the process was full",
);

check(
  "it says the cause sat upstream, in an interview, and names the passing question",
  /in passing/i.test(words) && /interview/i.test(words),
  "without the cause, the reader cannot connect the change request to the interview that made it necessary",
);

check(
  "it says where the answer went: into the opening document, twice",
  /table of what the interview settled/i.test(words) && /"not in scope"/.test(words),
  "the two places the unneeded answer was written are what turned it into a contract; a summary that drops them drops the mechanism",
);

check(
  "it says the price of the fix out loud: a skipped question leaves no trace",
  /leaves no trace/i.test(words),
  "a principle that lists only the benefit is the kind nobody trusts the second time",
);

done();
