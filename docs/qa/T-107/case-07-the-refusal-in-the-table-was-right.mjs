// T-107 DoD item 7 (reported blocking by the second security review): the
// `CRD 0027` evidence condemns ONE of the two lines the user's "no" went into —
// the copy under "not in scope" — and says plainly that the line in the table of
// what the interview settled was CORRECT and has to stay.
//
// What it proves: the principle cannot be read as permission to drop a refusal
// the user actually gave. The old wording judged both lines at once ("Neither
// line was needed to start the work"), and a PM applying it faithfully would
// leave a real "no" out of the opening document — then go on to do the thing the
// user said no to, with the file's own words behind it. That is the failure this
// item exists to close, and it is the reason the whole job's rule is "a question
// the user SKIPPED", never "an answer the user gave".
//
// WHY THE FORBIDDEN STRING NEEDS A REVERSE PROOF. "This string is absent" is the
// one assertion that also passes when nothing was read — shape 4 of
// `ADR 0023`. So the same read is first shown to find a string that must be
// there. Absence is only evidence once presence has been demonstrated.
//
// What it does NOT prove: that a PM reading it draws the line correctly on a real
// interview. Telling a refusal from a skip is a judgement about one exchange.
//
// PINNING STYLE: FLATTENED — the paragraphs wrap at 80 columns and every sentence
// here crosses a line break — and sliced to principle 22.

import { check, done, flat, repoFile } from "../lib/qa.mjs";

function principle(text, number) {
  const lines = text.split("\n");
  const first = lines.findIndex((line) => new RegExp(`^## ${number}\\. `).test(line));
  if (first === -1) throw new Error(`no "## ${number}. " heading`);
  const next = lines.findIndex((line, index) => index > first && /^## /.test(line));
  return lines.slice(first, next === -1 ? lines.length : next).join("\n");
}

/**
 * Flatten, having first dropped the `> ` blockquote marker.
 *
 * The three authoritative paragraphs are quoted as BLOCKQUOTES in
 * `principles.md`, and `flat()` collapses whitespace without touching `> `. So a
 * sentence that wraps inside a quote flattens to "…into the table > of what the
 * interview settled…", and a pattern written against the sentence matches
 * nothing. That is not a hypothetical: the first version of this case reported
 * two false failures against text that was correctly in the file.
 */
const quoteless = (text) => flat(text.replace(/^[ \t]*>[ \t]?/gm, ""));

const file = repoFile("principles.md");
const words = quoteless(principle(file, 22));
const whole = quoteless(file);

console.log(`principle 22: ${words.length} flattened characters`);

// ------------------------------------------------------------ reverse proof
check(
  "this case really read principle 22, so an absence below is a fact",
  words.length > 5000 && /CRD 0027/.test(words) && /v0\.9\.0/.test(words),
  `${words.length} characters, and the CRD 0027 evidence ${/CRD 0027/.test(words) ? "is" : "is NOT"} in the slice`
    + " — without this, the two absence checks below would pass on an empty read",
);

// ------------------------------------------------ the judgement that had to go
const GONE = "Neither line was needed";

check(
  `the old both-lines-at-once judgement is gone: "${GONE}"`,
  !whole.includes(GONE),
  "the sentence condemns the table entry along with the copy under \"not in scope\"."
    + " A PM applying it faithfully drops a refusal the user really gave, and then does the thing they refused",
);

check(
  "and no other sentence condemns the two lines together",
  !/both of (?:them|those lines) (?:were|was) (?:un)?necessary/i.test(words)
    && !/neither of (?:them|those lines) was needed/i.test(words),
  "the exact string went but an equivalent one took its place — the rule is about the judgement, not the wording",
);

// ------------------------------------------------ the half that must be there
check(
  "the principle says one of the two lines was right and the other is the problem",
  /One of those two lines was right/i.test(words),
  "the evidence still reads as if both lines were mistakes, which is the reading the security review reported",
);

check(
  "it says the entry in the interview table WAS correct",
  /was correct/i.test(words) && /table of what the interview settled/i.test(words),
  "the correct line is never called correct, so a reader has to infer it — and the safe inference is the wrong one",
);

check(
  "and that a line like it has to stay",
  /has to stay/i.test(words),
  "saying it was correct once is not the same as telling the next PM to keep writing it",
);

check(
  "it says why: the user gave a real refusal and the table is where a refusal is recorded",
  /real refusal/i.test(words) && /where a refusal is recorded/i.test(words),
  "without the reason, the rule is a special case a reader cannot apply to any other interview",
);

check(
  "it names the cost of dropping one: the crew goes on to do the thing the user said no to",
  /said no to/i.test(words),
  "this is the harm the item exists to prevent, and a rule with no stated harm is one that gets traded away",
);

check(
  'it names the copy under "not in scope" as the line that did the damage',
  /"not in scope" is the line that did the damage/i.test(words),
  "the blame has to land on one specific line, or the reader is left to guess which of the two to stop writing",
);

check(
  "and it says what makes the two different: a table entry can be changed, a boundary has to be overturned",
  /can change by saying so/i.test(words) && /has to be overturned/i.test(words),
  "this is the mechanism behind the whole rule; without it the distinction looks arbitrary",
);

// The same distinction has to hold in the quoted rule itself, or the evidence and
// the rule disagree. Paragraph B is the one that governs what gets written down.
check(
  "paragraph B, as quoted in principle 22, keeps an answered question in the table",
  /A question the user answered goes into the table of what the interview settled, and a "no" is an answer/i.test(words),
  "the evidence says a refusal must be recorded and the quoted rule does not — two rules, and a reader may follow either",
);

check(
  "and it says only a skipped question leaves nothing behind",
  /Only "leave it undecided" leaves nothing behind/i.test(words)
    && /never drop a refusal the user actually gave/i.test(words),
  "the exemption has to be tied to the option the user chose, not to the subject they were asked about",
);

done();
