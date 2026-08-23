// T-107 DoD item 5: the principles are still numbered 1 to 22, with no number
// added and none skipped.
//
// What it proves: this task put its reasons INSIDE principle 22, where the rule
// they explain already lives, rather than opening a principle 23. That matters
// beyond tidiness: every role prompt, `CLAUDE.md` and this job's own documents
// cite principles by number, and those citations are plain text that nothing
// resolves. A renumbering breaks every one of them silently.
//
// What it does NOT prove: that the citations elsewhere point at the right
// principle — only that the numbers they point at still exist and did not shift.
//
// PINNING STYLE: LINE-BASED. A `## 22. ` heading cannot wrap.

import { before } from "./baseline.mjs";
import { check, done, repoFile } from "../lib/qa.mjs";

const numbersIn = (text) =>
  text.split("\n")
    .map((line) => /^## (\d+)\. /.exec(line))
    .filter(Boolean)
    .map((hit) => Number(hit[1]));

const now = numbersIn(repoFile("principles.md"));

console.log(`principles.md: ${now.length} numbered principle(s) — ${now.join(", ")}`);

check(
  "principles.md really has numbered principles",
  now.length > 0,
  "no `## <n>. ` heading found at all — this case read nothing, so everything below would be vacuous",
);

check(
  "they run 1, 2, 3 … with no gap and no repeat",
  now.every((number, index) => number === index + 1),
  `the sequence is ${now.join(", ")} — a gap breaks every citation after it, a repeat makes "principle 14" ambiguous`,
);

check(
  "the last one is still 22: no principle was added",
  now.at(-1) === 22,
  `the file ends at ${now.at(-1)} — this task's reasons belong inside principle 22, not in a new one`,
);

const was = before("principles.md");

check(
  "the job's start commit is readable, so this case has a BEFORE at all",
  was.ok,
  was.ok ? "" : was.why,
);

if (was.ok) {
  const then = numbersIn(was.text);
  check(
    "the count is exactly what it was before this job",
    then.length === now.length,
    `${then.length} before, ${now.length} now (${then.join(", ")} → ${now.join(", ")})`,
  );
}

done();
