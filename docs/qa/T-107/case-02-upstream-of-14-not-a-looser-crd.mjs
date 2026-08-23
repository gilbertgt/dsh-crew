// T-107 DoD item 2 (PRD M1 item 5): principle 22 says in so many words that the
// new guard sits UPSTREAM of principle 14 and does not loosen it — and principle
// 14 itself is unchanged, byte for byte, against the job's start commit.
//
// What it proves: the two halves of that DoD item, and they need each other. The
// sentence alone could sit above a principle 14 that had quietly been relaxed;
// the byte comparison alone would leave a reader guessing how the two rules
// relate, which is how "a question may be skipped" becomes "small changes may
// skip the CRD" in somebody's memory two jobs from now. That reading was
// considered by the user in this job's own interview and dropped after a
// backtest, so it is a live wrong turn, not an imaginary one.
//
// What it does NOT prove: that a future PM honours the distinction. Nothing can.
//
// PINNING STYLE: two styles on purpose. The relationship sentence is FLATTENED
// (wrapped prose). The unchanged-ness of principle 14 is RAW BYTES against
// `git show <start commit>:principles.md` — a flattened comparison there would
// pass a paragraph that had been re-broken into different sentences.

import { before } from "./baseline.mjs";
import { check, done, flat, repoFile } from "../lib/qa.mjs";

/** One `## <n>. …` principle, from its heading to the next `^## `. */
function principle(text, number) {
  const lines = text.split("\n");
  const first = lines.findIndex((line) => new RegExp(`^## ${number}\\. `).test(line));
  if (first === -1) throw new Error(`no "## ${number}. " heading`);
  const next = lines.findIndex((line, index) => index > first && /^## /.test(line));
  return lines.slice(first, next === -1 ? lines.length : next).join("\n");
}

const text = repoFile("principles.md");
const words = flat(principle(text, 22));

// -------------------------------------------------- half one: the sentence
check(
  "principle 22 names principle 14 and calls the new rule a guard upstream of it",
  /upstream of principle 14/i.test(words),
  "principle 22 does not place itself relative to the CRD rule, so the two read as competing rules about the same thing",
);

check(
  "it says out loud that this is not a loosening",
  /not a loosening/i.test(words),
  'without the negative, "we made questions cheaper" is a short walk from "we made change requests cheaper"',
);

check(
  "it says principle 14 keeps all of it: the CRD, the user's yes, and never deleting one",
  /Not one word of principle 14 changes/i.test(words)
    && /user's yes/i.test(words)
    && /never deleted/i.test(words),
  "the sentence has to say WHICH parts of 14 survive, or the reader has to go and check",
);

check(
  "it says where the fix belongs instead: earlier, at the moment the line is written",
  /(earlier|the moment the line is written)/i.test(words) && /never reaches the document/i.test(words),
  "the mechanism is the whole difference between an upstream guard and a loosened rule",
);

check(
  "it records the repair that was looked at and dropped, with the number that decided it",
  /\.md.{0,40}(skip|files)/is.test(words) && /9 of this repository's 27/i.test(words),
  "the rejected option — letting a `.md`-only change skip the CRD — is what stops the next person re-running the same search"
    + " (`principles.md` keeps a table of rejected ideas for exactly this reason)",
);

// ------------------------------------------- half two: principle 14 untouched
const was = before("principles.md");

check(
  "the job's start commit is readable, so this case has a BEFORE at all",
  was.ok,
  was.ok ? "" : was.why,
);

if (was.ok) {
  const then = principle(was.text, 14);
  const now = principle(text, 14);
  console.log(`principle 14: ${then.length} characters at the start commit, ${now.length} now`);
  const firstDifference = [...now].findIndex((character, index) => character !== then[index]);
  check(
    "principle 14 is unchanged, byte for byte",
    now === then,
    `they differ at character ${firstDifference}`
      + `\n      before: ${JSON.stringify(then.slice(Math.max(0, firstDifference - 60), firstDifference + 60))}`
      + `\n      after : ${JSON.stringify(now.slice(Math.max(0, firstDifference - 60), firstDifference + 60))}`,
  );
  // Reverse proof: the comparison above is a `===` on two strings, and two empty
  // strings are also equal. Show that both sides are the real principle.
  check(
    "and both sides of that comparison are really principle 14",
    then.length > 2000 && /Documents are the only channel/.test(now),
    `${then.length} characters before, ${now.length} now — a slice that found nothing would have compared "" with "" and passed`,
  );
}

done();
