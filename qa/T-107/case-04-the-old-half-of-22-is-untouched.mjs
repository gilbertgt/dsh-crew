// T-107 DoD item 4: the parts principle 22 already had — the six kinds of
// question, the funnel, the two failure modes and the stop rule — are unchanged,
// word for word, against the job's start commit.
//
// What it proves: this task ADDED to principle 22 and took nothing away from
// those four. That is the failure worth guarding: nobody deletes a rule, somebody
// rewrites the paragraph around it while adding a new one, and a sentence goes
// missing that no check ever named.
//
// WHY THIS CASE WAS NARROWED — `ADR 0028`. Its first version compared EVERYTHING
// in principle 22 above this job's first addition, byte for byte. That slice held
// one paragraph more than the DoD names: the sentence listing what principle 22
// adds. The second round legitimately rewrote that sentence — it is an exhaustive
// claim ("adds IS the six kinds, the funnel, …") and principle 22 now adds three
// more rules, so the old wording had become false — and this case went red on
// correct work. A check that forces a document to keep a sentence its readers can
// see is false has the arrow pointing the wrong way.
//
// So the comparison range is now EXACTLY the four blocks DoD item 4 names, and
// nothing else. The sentence that lists them is DoD item 6's, and it is checked
// by `case-06`, which is where its DoD entry lives.
//
// HOW THIS DIFFERS FROM `ADR 0028`'s LETTER, and why. The ADR says to move the
// slice's end anchor back to the last sentence of the stop rule. That gives the
// right range today, and this case goes one step further: it slices and compares
// each protected paragraph ON ITS OWN. Same range, two gains — a failure names
// WHICH block moved, and inserting a new paragraph BETWEEN two protected blocks
// no longer reds, which a single prefix slice would do even with all four blocks
// intact. That last one is the very over-pinning `ADR 0028` exists to forbid, so
// this is the ADR's own general rule ("the slice's two ends must land on the
// boundaries of what the DoD cell names") applied more tightly, not a departure
// from it. Reported to the PM rather than done quietly.
//
// HOW THE "BEFORE" IS FOUND, without typing any of it here: each block is located
// in BOTH versions by its own bold lead-in and compared. So the case carries no
// copy of the wording and cannot rot when the wording is legitimately changed —
// it will simply say so, loudly, naming the block.
//
// What it does NOT prove: that the new text contradicts none of the four. A doc
// reviewer reads that. It also no longer covers the fifth paragraph at all — it
// was moved OUT of this case's range by `ADR 0028`, deliberately, and that is not
// the same as nobody having thought about it.
//
// PINNING STYLE: RAW BYTES per block. Flattening would let a paragraph be
// re-wrapped into different sentences and still pass, and "one word untouched" is
// the claim.

import { before } from "./baseline.mjs";
import { check, done, repoFile } from "../lib/qa.mjs";

function principle(text, number) {
  const lines = text.split("\n");
  const first = lines.findIndex((line) => new RegExp(`^## ${number}\\. `).test(line));
  if (first === -1) throw new Error(`no "## ${number}. " heading`);
  const next = lines.findIndex((line, index) => index > first && /^## /.test(line));
  return lines.slice(first, next === -1 ? lines.length : next).join("\n");
}

/** The blank-line separated paragraphs of a slice. */
const paragraphs = (text) => text.split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean);

/**
 * The one paragraph of principle 22 that starts with `opening`.
 * @throws when it is not there or is there twice — either way the case must die
 * loudly rather than compare nothing with nothing.
 */
function block(text, opening, where) {
  const found = paragraphs(principle(text, 22)).filter((paragraph) => paragraph.startsWith(opening));
  if (found.length !== 1) {
    throw new Error(`${where}: ${found.length} paragraph(s) of principle 22 start with ${JSON.stringify(opening)}`);
  }
  return found[0];
}

// The four blocks the DoD names, each by its own opening. The six kinds run over
// two paragraphs — the list, then the note about the sixth kind — so both are here.
const BLOCKS = [
  ["the six kinds of question", "**Rule.**"],
  ["the note on the sixth kind", "The sixth kind"],
  ["the funnel", "**Wide first, then narrow.**"],
  ["the two failure modes", "**Two failure modes.**"],
  ["the stop rule", "**The stop rule, and this is the load-bearing part.**"],
];

const text = repoFile("principles.md");
const was = before("principles.md");

check(
  "the job's start commit is readable, so this case has a BEFORE at all",
  was.ok,
  was.ok ? "" : was.why,
);

let compared = 0;

for (const [name, opening] of BLOCKS) {
  let now;
  try {
    now = block(text, opening, "today");
  } catch (error) {
    check(`${name} is still a paragraph of principle 22`, false, error.message);
    continue;
  }

  console.log(`${name}: ${now.length} characters today`);

  check(
    `${name} was not gutted`,
    now.length > 100,
    `${now.length} characters — too short to be this block`,
  );

  if (!was.ok) continue;

  let then;
  try {
    then = block(was.text, opening, "the start commit");
  } catch (error) {
    check(`${name} can be found in the start commit too`, false, error.message);
    continue;
  }

  compared += 1;
  const firstDifference = [...now].findIndex((character, index) => character !== then[index]);
  check(
    `${name}: every byte is the byte that was there before this job`,
    now === then,
    `they differ at character ${firstDifference} (${then.length} characters before, ${now.length} now)`
      + `\n      before: ${JSON.stringify(then.slice(Math.max(0, firstDifference - 80), firstDifference + 80))}`
      + `\n      after : ${JSON.stringify(now.slice(Math.max(0, firstDifference - 80), firstDifference + 80))}`,
  );
}

// Reverse proof: every assertion above is a `===`, and two empty strings are
// equal too. This says real blocks were really compared.
if (was.ok) {
  check(
    "all five paragraphs were really found in both versions and compared",
    compared === BLOCKS.length,
    `${compared} of ${BLOCKS.length} compared — the rest were never looked at, so their `
      + "pass above means nothing",
  );
}

done();
