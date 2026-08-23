// T-109 DoD item 3: the paragraph added just before this job — "This file says
// how the repository works today. It is not a change log." — is untouched, word
// for word, and it is still the opening of the `## Documentation` section.
//
// What it proves: this task obeyed the rule it was working next to. That is not a
// formality here: the rule is one commit old (`a692409`, "CLAUDE.md stops being a
// change log"), and the very next job to edit the file is the one most likely to
// undo it — by rewording the paragraph while writing near it, or by demoting it
// out of the place a reader meets first.
//
// What it does NOT prove: that the rest of `CLAUDE.md` obeys the rule. Item 4 of
// this DoD covers the lines this job added; the sentences the file already had
// are not this task's to answer for.
//
// PINNING STYLE: FLATTENED for the sentence (it wraps after "Somebody reading it
// is"), LINE-BASED for where the paragraph sits (a `## ` heading cannot wrap),
// and RAW BYTES against the start commit for the whole paragraph.

import { before } from "./baseline.mjs";
import { check, done, flat, repoFile } from "../lib/qa.mjs";

const SENTENCE = "**This file says how the repository works today. It is not a change log.**";

/** The `## Documentation` section, anchored to the start of a line. */
function documentation(text, where) {
  const lines = text.split("\n");
  const first = lines.findIndex((line) => line.trim() === "## Documentation");
  if (first === -1) throw new Error(`${where}: CLAUDE.md has no line-start "## Documentation" heading`);
  const next = lines.findIndex((line, index) => index > first && /^## /.test(line));
  return lines.slice(first, next === -1 ? lines.length : next).join("\n");
}

/** The paragraph that opens a section: from the first non-empty line after the heading to the next blank line. */
function firstParagraph(section) {
  const body = section.split("\n").slice(1);
  const start = body.findIndex((line) => line.trim() !== "");
  const rest = body.slice(start);
  const end = rest.findIndex((line) => line.trim() === "");
  return rest.slice(0, end === -1 ? rest.length : end).join("\n");
}

const text = repoFile("CLAUDE.md");
const section = documentation(text, "today");
const paragraph = firstParagraph(section);

console.log(`\`## Documentation\`: ${section.length} characters; its opening paragraph: ${paragraph.length} characters over ${paragraph.split("\n").length} lines`);

check(
  "the sentence is still in CLAUDE.md, word for word, bold markers and all",
  flat(text).includes(SENTENCE),
  `not found. Two ways this fails and they look the same flattened: the words changed, or the bold markers moved`
    + `\n      wanted: ${JSON.stringify(SENTENCE)}`,
);

check(
  "and it opens the `## Documentation` section, where a reader meets it first",
  flat(paragraph).startsWith(SENTENCE),
  `the section now opens with: ${JSON.stringify(flat(paragraph).slice(0, 120))}`
    + "\n      a rule about how to write this file, buried below the writing, is a rule that gets missed",
);

check(
  "the paragraph still says what to write instead of history",
  /never the story of how something got that way/i.test(flat(paragraph)),
  "the positive half is gone; a rule that only forbids leaves the writer guessing",
);

check(
  "and it still keeps the exception it was written with: a reason is not history",
  /The reason a rule exists is not history/i.test(flat(section)),
  "without the exception, the next person deletes the reasons too, which is the opposite of what this file is for",
);

const was = before("CLAUDE.md");

check(
  "the job's start commit is readable, so this case has a BEFORE at all",
  was.ok,
  was.ok ? "" : was.why,
);

if (was.ok) {
  const then = firstParagraph(documentation(was.text, "the start commit"));
  const firstDifference = [...paragraph].findIndex((character, index) => character !== then[index]);
  check(
    "every byte of that paragraph is the byte that was there before this job",
    paragraph === then,
    `they differ at character ${firstDifference} (${then.length} characters before, ${paragraph.length} now)`
      + `\n      before: ${JSON.stringify(then.slice(Math.max(0, firstDifference - 80), firstDifference + 80))}`
      + `\n      after : ${JSON.stringify(paragraph.slice(Math.max(0, firstDifference - 80), firstDifference + 80))}`,
  );
  check(
    "and both sides of that comparison really held the paragraph",
    then.length > 300 && paragraph.length > 300,
    `${then.length} characters before, ${paragraph.length} now — a slice that found nothing would compare "" with "" and pass`,
  );
}

done();
