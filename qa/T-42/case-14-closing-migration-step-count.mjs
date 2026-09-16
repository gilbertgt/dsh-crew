// T-42, DoD item 5, read the other way round. "收尾那道门" can mean step 10's
// finish gate (case-12) or step 18's CLOSING migration step — move what is
// durable out of a single-use document before it is dropped. The two readings
// cost one case each, so both are covered rather than guessed at; QA's report
// says so.
//
// That step had no pin of its own, and the presence check above it cannot be
// one: delete the whole paragraph and all three of its paths are still somewhere
// else in the prompt, so every check stayed green while "not needed any more"
// quietly became "lost". The pin is a COUNT of `qa/gaps.md`, because
// `includes` stops at the first copy.
//
// It is a floor, not an exact number, so this case counts what is really there
// and leaves a fixed number behind. Copies are rewritten to another path rather
// than deleted, so only the count moves and the paragraphs around it stay the
// length they were.
//
// WHERE THE COPIES LIVE, AND WHY THIS CASE HAD TO MOVE WITH THEM (Crew V2).
// Every assertion here is unchanged in MEANING — "the pin's floor is really met,
// and dropping below it is red" — but the subject is different in one way that
// matters: the pin reads `composePmRules()` (core plus playbooks), while this
// case used to read and mutate `roles/pm.md` alone. V2 moved these copies into
// `roles/playbooks/`, so the old case stopped being about the pin at all: it
// counted zero, and `keepCopies()` threw before any run happened.
//
// Two ways to get that wrong are refused here rather than papered over:
//   * the floor is counted over the COMPOSED text, read back with
//     `composePmRulesIn(dir)` — the same reading the pin does. Counting the core
//     alone would be a green about a file the rule has left.
//   * the mutation is written into whichever playbooks really hold the copies,
//     discovered from the composition, not hard-coded to `roles/pm.md`. A
//     mutation that lands in a file the pin does not read is the false green
//     this case exists to prevent: the copy stays correct, verify-mount stays
//     green, and the case reports a pass for a pin it never touched.

import { PLAYBOOKS } from "../../host/playbooks.js";
import { check, done, tempRepo, runCheck, cleanUp, composePmRulesIn, copyFile, editAll, keepCopies, expectRed, expectGreen, saidOk } from "../lib/qa.mjs";

const PATH = "qa/gaps.md";
const FAIL = "and it needs 3";
const REGISTERED = "PM prompt section registered";
const CORE = "roles/pm.md";
const ELSEWHERE = "qa/somewhere-else.md";
const playbookPath = (file) => `roles/playbooks/${file}`;
// The migration step's own sentence, one of the seven homes of a dropped
// document. Only used to state that the paragraph the count protects is still
// there; the count itself is the pin (see the header).
const MIGRATION_STEP = "Move what is durable out before you drop anything.";

/** Every file that makes up the composed rules, in composition order. */
const RULE_FILES = [CORE, ...PLAYBOOKS.map((playbook) => playbookPath(playbook.file))];

/** How many copies of `PATH` a text holds. */
const copiesIn = (text) => text.split(PATH).length - 1;

/** Which files of a repository COPY hold at least one copy of `PATH`. */
const holdersIn = (dir) => RULE_FILES.filter((relative) => copiesIn(copyFile(dir, relative)) > 0);

/**
 * Leave exactly `keep` copies of `PATH` across the whole composed rules of a
 * copy, rewriting the rest to another path, and re-read the result from THAT
 * copy. Every file that holds a copy is walked in composition order, counting
 * what is left to keep, so the total is what the caller asked for whatever the
 * split between core and playbooks happens to be today.
 *
 * @returns the list of `file: kept` strings, for the assertion messages
 */
function cutTo(dir, keep) {
  let left = keep;
  const kept = [];
  for (const relative of RULE_FILES) {
    const copies = copiesIn(copyFile(dir, relative));
    if (copies === 0) continue;
    const here = Math.min(left, copies);
    if (here > 0) {
      keepCopies(dir, relative, PATH, here, ELSEWHERE);
      kept.push(`${relative}: ${here}`);
    } else {
      // Nothing is left to keep, so EVERY copy in this file goes — by name, so
      // the edit cannot silently match nothing (editAll throws when it does).
      editAll(dir, relative, PATH, ELSEWHERE);
      kept.push(`${relative}: 0`);
    }
    left -= here;
  }
  return kept;
}

// A quick survey of where the copies are, so the case says it out loud and the
// mutation below cannot be aimed at the wrong file without anybody noticing.
const survey = tempRepo();
const liveHolders = holdersIn(survey);
const liveComposed = composePmRulesIn(survey);
cleanUp(survey);

const dir = tempRepo();
try {
  const base = runCheck(dir, "tools/verify-mount.mjs");
  expectGreen(base, "the untouched copy is green (so the red below is the mutation)");
  check(`the copy says: ok ${REGISTERED}`, saidOk(base, REGISTERED), base.out);
  console.log(`note  \`${PATH}\` holders: ${liveHolders.join(", ")} (${copiesIn(liveComposed)} copy/copies in the composed rules)`);
  const copies = copiesIn(composePmRulesIn(dir));
  check(`the composed PM rules hold at least the 3 copies of \`${PATH}\` the pin needs (they hold ${copies})`, copies >= 3, "the floor is not met");
  // This is the V2 half of the same statement, and it is why the mutation below
  // walks every holder instead of one file: the pin is a count over the composed
  // text, so a copy in ANY of these files counts towards the floor.
  check(`the copies really are in ${liveHolders.join(" and ")}, which is where this case mutates`, liveHolders.length > 0, "no holder found — the rule is gone from the composed rules");
  // What the count is FOR, asserted so the mutation above cannot be made vacuous
  // by the copy moving out of the closing migration step and leaving the floor
  // met somewhere else: the composed rules must still hold that step's own
  // instruction, one of the seven homes, which is the paragraph the pin protects.
  check("the closing migration step itself is still in the composed rules (the paragraph the count protects)", composePmRulesIn(dir).includes(MIGRATION_STEP), MIGRATION_STEP);
  check(`and the playbook that holds it (${playbookPath(PLAYBOOKS[0].file)}) is one of the files this case mutates`, liveHolders.includes(playbookPath(PLAYBOOKS[0].file)), liveHolders.join(", "));
} finally {
  cleanUp(dir);
}

// Red: two copies left, so the count is below its floor.
const two = tempRepo();
try {
  const held = cutTo(two, 2);
  const run = runCheck(two, "tools/verify-mount.mjs");
  expectRed(run, FAIL, `the composed rules cut from ${held.join(", ")} down to 2 copies of \`${PATH}\` are red`);
  check("and the PM prompt section is not reported as registered", !saidOk(run, REGISTERED), run.out);
} finally {
  cleanUp(two);
}

// Red with one copy left too. The pin above it in the chain only asks whether
// the path is present at all, and one copy satisfies that, so the COUNT is still
// what speaks — asserted, so the two pins cannot be silently swapped for each
// other.
const one = tempRepo();
try {
  cutTo(one, 1);
  const run = runCheck(one, "tools/verify-mount.mjs");
  expectRed(run, FAIL, "the composed rules cut to 1 copy are red, and it is still the count pin that says so");
} finally {
  cleanUp(one);
}

// Green: exactly three copies. The floor is met, and a text that has since grown
// a fourth (it holds seven today) is not reddened for it.
const three = tempRepo();
try {
  cutTo(three, 3);
  expectGreen(runCheck(three, "tools/verify-mount.mjs"), "exactly 3 copies stays green (the pin is a floor, not an exact count)");
} finally {
  cleanUp(three);
}

// The V2-specific guard, said out loud rather than assumed. While the copies
// live only in the playbooks, an anchored edit against `roles/pm.md` cannot move
// the count the pin reads — so a case that kept the old `keepCopies(copy,
// "roles/pm.md", …)` line would be a green about nothing. This is the fact that
// makes the mutations above walk the holders instead; it is asserted so the day
// the copies move back into the core, this case says so instead of quietly
// testing the wrong file.
const coreOnly = tempRepo();
try {
  if (liveHolders.includes(CORE)) {
    console.log(`note  \`${PATH}\` also lives in ${CORE} today, so the old anchor would have worked — the mutations above still cover it`);
  } else {
    check(`${CORE} holds no \`${PATH}\`, so the mutation has to target ${liveHolders.join(" and ")}`, copiesIn(copyFile(coreOnly, CORE)) === 0, CORE);
    check(`and the composed rules in a copy are what the pin reads (${copiesIn(liveComposed)} copy/copies, floor 3)`, copiesIn(composePmRulesIn(coreOnly)) === copiesIn(liveComposed), `${copiesIn(composePmRulesIn(coreOnly))} vs ${copiesIn(liveComposed)}`);
  }
} finally {
  cleanUp(coreOnly);
}

done();
