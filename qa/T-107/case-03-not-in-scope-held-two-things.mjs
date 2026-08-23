// T-107 DoD item 3: the reason behind paragraph C is written down — "not in
// scope" was one heading holding two opposite things: a real boundary, and
// something the crew simply did not get to this time.
//
// What it proves: the file explains WHY the list was split, not only that it was.
// Paragraph C itself (checked verbatim in case-01) states the rule; this case is
// about the half a role prompt has no room for. Without it, the next person
// reading a short "not in scope" list will assume something was forgotten and put
// the second kind back.
//
// It also pins the trap: the second kind does not move to "still undecided"
// either. That is the obvious wrong fix — it looks like honesty and it writes the
// line down anyway, which is the exact failure paragraph B exists to stop.
//
// What it does NOT prove: that a real list is classified correctly. That is a
// judgement about one item at one moment, and it belongs to a person.
//
// PINNING STYLE: FLATTENED and sliced to principle 22 alone.

import { check, done, flat, repoFile } from "../lib/qa.mjs";

function principle(text, number) {
  const lines = text.split("\n");
  const first = lines.findIndex((line) => new RegExp(`^## ${number}\\. `).test(line));
  if (first === -1) throw new Error(`no "## ${number}. " heading`);
  const next = lines.findIndex((line, index) => index > first && /^## /.test(line));
  return lines.slice(first, next === -1 ? lines.length : next).join("\n");
}

const words = flat(principle(repoFile("principles.md"), 22));

check(
  '"not in scope" is named as having held two different things under one name',
  /two different things under one name/i.test(words),
  "the diagnosis is missing, so the rule reads as a preference about list length",
);

check(
  "the first kind is described by its price: finished work rebuilt, or a crossing that cannot be undone",
  /built again/i.test(words) && /cannot be undone/i.test(words),
  "without the price, a reader has no test to apply to an item",
);

check(
  "the second kind is described as costing only a little more work",
  /a little more work/i.test(words),
  "the contrast is the whole rule; one kind described and the other implied is not a test anybody can run",
);

check(
  "it says what writing the second kind down actually costs the user",
  /overturn/i.test(words),
  "the cost falls on the user, not the crew, which is why it is easy to miss",
);

check(
  "it says why the safe-looking reading is the wrong one",
  /safe reading is the expensive one/i.test(words),
  "the reader is told the list is ambiguous but not which way the ambiguity breaks",
);

check(
  'and it closes the obvious wrong fix: the second kind does not move to "still undecided"',
  /not into "still undecided" either/i.test(words),
  'moving the item to another section is the fix a reader will invent, and it writes the line down just the same',
);

check(
  'it repeats what "still undecided" is for, positively',
  /known to be needed at a known later point/i.test(words),
  'a section defined only by what it excludes gets filled with whatever is left over',
);

done();
