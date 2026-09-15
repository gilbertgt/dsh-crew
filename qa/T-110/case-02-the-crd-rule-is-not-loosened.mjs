// T-110 DoD item 3: the change log says out loud that none of this loosens the
// change-request rule — if saying yes to a later ask would move the milestone
// list, a DoD item or the scope, the PM still writes the change request and still
// asks the user first.
//
// What it proves: the qualifier reached the audience most likely to over-read the
// headline. "You can leave questions undecided and ask later, free" is a sentence
// a user will remember, and the one place they meet it without any surrounding
// context is the change log. Every other carrier of this rule — `roles/pm.md`,
// `principles.md`, `CLAUDE.md` — states the limit next to the exemption, because
// this job decided the guard sits UPSTREAM of principle 14 and does not relax it.
// A change log that dropped the limit would be the only document in the set
// promising something the crew will not do, and the user would meet the
// difference as a broken promise.
//
// What it does NOT prove: that a user reads the qualifier, or that a PM honours
// it on a real request.
//
// PINNING STYLE: FLATTENED, sliced to the `### Changed` block of the entry that
// carries the promise. The limit must be in the same block as the promise: a
// caveat under a different heading is a caveat nobody reaches.

import { check, done, flat, repoFile } from "../lib/qa.mjs";

/**
 * Every `## ` version section of the change log, oldest last.
 */
function sectionsOf(source) {
  const lines = source.split("\n");
  const starts = lines.flatMap((line, index) => /^## /.test(line) ? [index] : []);
  return starts.map((start, position) => {
    const stop = position + 1 < starts.length ? starts[position + 1] : lines.length;
    return lines.slice(start, stop).join("\n");
  });
}

function subSection(section, name) {
  const lines = section.split("\n");
  const first = lines.findIndex((line) => line.trim() === `### ${name}`);
  if (first === -1) return null;
  const next = lines.findIndex((line, index) => index > first && /^### /.test(line));
  return lines.slice(first, next === -1 ? lines.length : next).join("\n");
}

/**
 * The section whose `### Changed` block carries the undecided-option promise.
 *
 * The entry is found by its PROMISE, not by being the topmost section. It was the
 * top one when this case was written, and a later release legitimately sits above
 * it: pinning "the first `## `" would then check a release note that never
 * mentioned this change, and would go red for the wrong reason — or, worse, go
 * green because a newer entry happened to reuse the words. Locating it by the
 * promise keeps the real question ("does the entry that grants the option also
 * state its limit?") and fails closed when no entry grants it at all.
 */
const withPromise = sectionsOf(repoFile("CHANGELOG.md"))
  .map((section) => ({ section, changed: subSection(section, "Changed") }))
  .filter(({ changed }) => changed !== null && /leave it undecided/i.test(flat(changed)));

check(
  "exactly one change-log entry carries the undecided-option promise",
  withPromise.length === 1,
  `${withPromise.length} entr(y/ies) carry it — the promise must be documented once, with its limit`,
);

if (withPromise.length !== 1) done();

const changed = withPromise[0].changed;

const words = flat(changed);

check(
  "the change log says the change-request rule itself is not loosened",
  /not loosened|is not\s+loosened/i.test(words),
  "the headline promise stands with no limit, and the change log becomes the most optimistic document in the set",
);

check(
  "it says what IS gone, so the limit does not read as a retraction",
  /confirmed line/i.test(words),
  "a caveat that only takes something back leaves the reader unsure what they actually gained",
);

check(
  "it names all three things that bring the change-request rule back",
  /milestone list/i.test(words) && /DoD/i.test(words) && /\bscope\b/i.test(words),
  "the limit has to be checkable by the user, not a general warning",
);

check(
  "it says the PM still writes the change request in that case",
  /still writes the change request/i.test(words),
  "the user needs to know the process still happens, not merely that the rule 'applies'",
);

check(
  "and that the PM still stops and asks the user first",
  /stops and asks you/i.test(words),
  "being asked is the part of the change-request road the user actually experiences",
);

// The promise and its limit must be in ONE entry. Split across two bullets, a
// reader who stops at the first has been told only the generous half.
const bullets = changed.split(/\n(?=- )/).slice(1);

console.log(`### Changed holds ${bullets.length} entr(y/ies)`);

const bulletsWithPromise = bullets.filter((bullet) => /leave it undecided/i.test(flat(bullet)));
const bulletsWithLimit = bullets.filter((bullet) => /not loosened|is not\s+loosened/i.test(flat(bullet)));

check(
  "exactly one entry carries the undecided-option promise",
  bulletsWithPromise.length === 1,
  `${bulletsWithPromise.length} entries carry it — two accounts of one change can disagree`,
);

check(
  "the limit sits in that same entry",
  bulletsWithPromise.length === 1 && bulletsWithLimit.length === 1 && bulletsWithPromise[0] === bulletsWithLimit[0],
  "the promise and its limit are in different entries; a reader who stops after the first has the wrong rule",
);

// The entry also has to say where the rule came from, because a change with a
// stated cause is one a user can argue with.
check(
  "the entry says this came out of a real case rather than a preference",
  /real case/i.test(words),
  "the change reads as housekeeping, and the user has no way to judge whether it was worth making",
);

done();
