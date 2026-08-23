// T-109 DoD item 1 (PRD M1 item 7): the CRD bullet in `CLAUDE.md`'s "How a job
// runs" block gained a sentence — a question left undecided is written nowhere,
// so asking for it later is no change of scope and needs no CRD — and the rule
// that bullet already carried is unchanged, word for word.
//
// What it proves: both halves at once, and neither is worth much alone. The new
// sentence alone could sit on a bullet whose original rule had been softened
// while nobody was looking; the unchanged bytes alone would leave the repository's
// own rule file silent about the guard the rest of this job installed, so the next
// person working here would read "any scope change gets a CRD", meet an undecided
// question, and write the CRD.
//
// HOW THE "BEFORE" IS FOUND, without typing the old rule here: the bullet is
// taken out of the start commit's own `CLAUDE.md` and every sentence of it must
// still be present. So the case carries no copy of wording that could rot.
//
// What it does NOT prove: that the new sentence is placed on the right bullet in
// a reader's judgement, or that it reads well. A doc reviewer judges that.
//
// PINNING STYLE: FLATTENED. The block is wrapped prose at 100 columns and both
// the old rule and the new sentence wrap mid-phrase.

import { before } from "./baseline.mjs";
import { check, done, flat, repoFile } from "../lib/qa.mjs";

/**
 * The list of load-bearing rules inside the "How a job runs" block.
 *
 * NOT the whole block: "How a job runs" opens with its own three-bullet list
 * (two lanes, one round of QA, one round of each review) and only then reaches
 * the paragraph "<N> rules there are load-bearing, and `principles.md` … carry
 * the reasons:" with the rules under it. Slicing the whole block puts 3 + 8 = 11
 * bullets in one basket and makes the count assertion below nonsense. The slice
 * therefore starts at the lead-in paragraph that states the count.
 */
function loadBearingRules(text, where) {
  const start = text.search(/^\w+ rules there are load-bearing/m);
  if (start === -1) throw new Error(`${where}: CLAUDE.md has no "<N> rules there are load-bearing" lead-in`);
  const rest = text.slice(start);
  const end = rest.search(/\n`host\/jobs\.js`|\n## /);
  return end === -1 ? rest : rest.slice(0, end);
}

/** Every `- ` bullet of a block, each from its own `- ` line to the next one. */
function bullets(block) {
  const lines = block.split("\n");
  const starts = lines.map((line, index) => (/^- /.test(line) ? index : -1)).filter((index) => index !== -1);
  return starts.map((first, position) =>
    lines.slice(first, position + 1 < starts.length ? starts[position + 1] : lines.length).join("\n"));
}

/** The one bullet that carries the CRD rule. */
function crdBullet(text, where) {
  const found = bullets(loadBearingRules(text, where)).filter((bullet) => /A CRD is written by the PM/.test(flat(bullet)));
  if (found.length !== 1) throw new Error(`${where}: ${found.length} bullet(s) carry the CRD rule, so the slice is ambiguous`);
  return found[0];
}

const text = repoFile("CLAUDE.md");
const block = loadBearingRules(text, "today");
const bullet = crdBullet(text, "today");
const words = flat(bullet);

console.log(`the load-bearing rule list: ${block.length} characters, ${bullets(block).length} bullet(s)`);
console.log(`the CRD bullet: ${bullet.length} characters over ${bullet.split("\n").length} lines`);

check(
  "the list still opens by counting its own rules and naming the principles behind them",
  /rules there are load-bearing/i.test(flat(block)) && /principles\.md/.test(flat(block)),
  "the lead-in no longer points at the reasons, so a reader has nowhere to go for them",
);

check(
  "the lead-in's count matches the number of bullets under it",
  (() => {
    const said = /(\w+) rules there are load-bearing/i.exec(flat(block));
    const words_ = { Six: 6, Seven: 7, Eight: 8, Nine: 9, Ten: 10 };
    return said !== null && words_[said[1]] === bullets(block).length;
  })(),
  `the lead-in says "${(/(\w+) rules there are load-bearing/i.exec(flat(block)) ?? [, "?"])[1]}" and there are ${bullets(block).length} bullets`
    + " — this job added a bullet, and a count left behind is how a reader learns to stop trusting the numbers here",
);

check(
  "the lead-in names principle 22 among the reasons",
  /principles\.md.{0,80}\b22\b/.test(flat(block)),
  "the new rules' reasons live in principle 22, and the list of principles the block cites does not include it",
);

// ------------------------------------------------------- the new sentence
check(
  "the CRD bullet says an undecided question is written nowhere in the opening document",
  /left undecided in the interview is written nowhere in the opening document/i.test(words),
  "the guard is not on the bullet, so this file still tells the next person that everything later is scope",
);

check(
  "it says the consequence: asking for it later is not scope and needs no CRD",
  /not a change of scope/i.test(words) && /needs no CRD/i.test(words),
  "the fact without its consequence leaves the reader to work out whether a CRD is needed, which is the thing they got wrong",
);

check(
  "it says the guard sits upstream and does NOT loosen the CRD rule",
  /upstream of this rule/i.test(words) && /does not loosen it/i.test(words),
  '"skipped questions need no CRD" without this line is one short step from "small things need no CRD"',
);

check(
  "it points at principle 22 for the authoritative wording",
  /principles\.md.{0,20}22/.test(words),
  "the bullet states a rule with no pointer to where the rule really lives, which is how two versions of it start",
);

// ------------------------------------------------- the old rule, unchanged
const was = before("CLAUDE.md");

check(
  "the job's start commit is readable, so this half has a BEFORE at all",
  was.ok,
  was.ok ? "" : was.why,
);

if (was.ok) {
  const then = flat(crdBullet(was.text, "the start commit"));
  console.log(`the CRD bullet held ${then.length} flattened characters at the start commit, ${words.length} now`);

  check(
    "the bullet grew rather than shrank",
    words.length > then.length,
    `${then.length} before, ${words.length} now — this task was to ADD a sentence`,
  );

  // Sentence by sentence, so a failure names the sentence that went missing.
  const sentences = then.split(/(?<=\.)\s+/).map((sentence) => sentence.trim()).filter((sentence) => sentence.length > 25);
  const missing = sentences.filter((sentence) => !words.includes(sentence));

  check(
    `every one of the ${sentences.length} sentences the bullet already had is still there, word for word`,
    missing.length === 0,
    `${missing.length} missing:\n      ${missing.map((sentence) => JSON.stringify(sentence)).join("\n      ")}`,
  );

  check(
    "and the comparison really had sentences to compare",
    sentences.length >= 3,
    `only ${sentences.length} sentence(s) were extracted from the start commit's bullet — the split found nothing, so the check above passed on an empty list`,
  );
}

done();
