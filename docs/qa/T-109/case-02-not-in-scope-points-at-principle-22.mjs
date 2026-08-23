// T-109 DoD item 2 (PRD M1 item 7): `CLAUDE.md` states the "not in scope" rule in
// one line, on its own bullet in the load-bearing list, and names principle 22 as
// where the authoritative wording and the reason live.
//
// What it proves: somebody working in THIS repository meets the rule in the file
// they are told to read, and is sent to the one place that holds the full text.
// The pointer is the load-bearing half. `CLAUDE.md` is a summary by design, so a
// rule stated here and nowhere else would become a second, shorter version of
// paragraph C, and two versions of a rule is no rule.
//
// The two strings this case pins are the ones the task's DoD item names, so a
// person following the DoD by hand and this case are checking the same thing.
//
// What it does NOT prove: that the one-line summary is a faithful shortening of
// paragraph C. A doc reviewer reads them side by side.
//
// PINNING STYLE: FLATTENED — both strings wrap in the source at 100 columns — and
// the two must be in the SAME bullet, because a rule in one bullet and a pointer
// in another is not a pointer anybody follows.

import { check, done, flat, repoFile } from "../lib/qa.mjs";

const RULE = '"Not in scope" in an opening document holds only items with a real cost';
const POINTER = "22 holds the authoritative wording and the reason";

function loadBearingRules(text) {
  const start = text.search(/^\w+ rules there are load-bearing/m);
  if (start === -1) throw new Error('CLAUDE.md has no "<N> rules there are load-bearing" lead-in');
  const rest = text.slice(start);
  const end = rest.search(/\n`host\/jobs\.js`|\n## /);
  return end === -1 ? rest : rest.slice(0, end);
}

function bullets(block) {
  const lines = block.split("\n");
  const starts = lines.map((line, index) => (/^- /.test(line) ? index : -1)).filter((index) => index !== -1);
  return starts.map((first, position) =>
    lines.slice(first, position + 1 < starts.length ? starts[position + 1] : lines.length).join("\n"));
}

const text = repoFile("CLAUDE.md");
const words = flat(text);
const list = bullets(loadBearingRules(text));

console.log(`CLAUDE.md: ${text.length} characters, ${list.length} load-bearing rule bullet(s)`);

check(
  `CLAUDE.md carries the rule: ${JSON.stringify(RULE)}`,
  words.includes(RULE),
  "the repository's own rule file does not state the new boundary rule at all",
);

check(
  `CLAUDE.md carries the pointer: ${JSON.stringify(POINTER)}`,
  words.includes(POINTER),
  "the rule is stated with no authority behind it, so this summary becomes a second version of paragraph C",
);

const carriers = list.filter((bullet) => flat(bullet).includes(RULE));

check(
  "exactly one bullet of the load-bearing list carries the rule",
  carriers.length === 1,
  carriers.length === 0
    ? "the rule is somewhere in the file but on no bullet of the list a reader works through"
    : `${carriers.length} bullets carry it — one rule in two places drifts the first time one is edited`,
);

if (carriers.length === 1) {
  const bullet = flat(carriers[0]);
  console.log(`\n--- the bullet, verbatim ---\n${carriers[0]}\n--- end (${carriers[0].length} characters) ---\n`);

  check(
    "the rule and the pointer are on the SAME bullet",
    bullet.includes(RULE) && bullet.includes(POINTER),
    "the pointer is on a different bullet, so a reader who stops at this rule never learns where its full text is",
  );

  check(
    "the bullet gives both qualifying costs",
    /built again/i.test(bullet) && /cannot be undone/i.test(bullet),
    "a one-line rule with only half the test is a rule that gets applied half the time",
  );

  check(
    "the bullet says what stays out and why that matters",
    /simply did\s+not do/i.test(bullet) && /overturn/i.test(bullet),
    "the half that changed in this job is the exclusion; without it the bullet says nothing new",
  );
}

// Reverse proof: this case asserts presence, so a wrong path would fail loudly
// already — but the numbers above are what a reader checks first.
check(
  "this case really read CLAUDE.md",
  text.length > 20_000 && list.length >= 8,
  `${text.length} characters and ${list.length} bullet(s) — too small to be CLAUDE.md`,
);

done();
