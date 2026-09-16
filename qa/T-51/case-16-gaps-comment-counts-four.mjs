// T-51, DoD item 18: the comment above the `qa/gaps.md` count pin says how many
// copies the PM rules really hold, and gives each copy its own job.
//
// What it proves: the comment no longer contradicts the rules it describes. It
// used to say `qa/gaps.md` appears THREE times in roles/pm.md while the file
// held four — and the pin's threshold is `< 3`, so deleting one copy is green.
// That is exactly the stale number that talks somebody into "tidying" a copy
// away. The comment is the only thing standing between a reader and that edit,
// and `tools/verify-mount.mjs` belongs to T-51: after handover nobody may fix it.
//
// What this case does NOT assert: that the comment's number equals today's live
// `grep -c` count. The rules may legitimately gain or lose a copy, while the
// comment may not be edited by anyone — an equality assertion would create a red
// that no task is allowed to clear. The live number is reported by hand at each
// milestone review instead.
//
// V2 (Crew V2) changed where the copies ARE, and the comment says so now. They no
// longer sit in `roles/pm.md` at all: the pin reads the composed rules
// (`composePmRules()`) and the seven copies live in `roles/playbooks/crew-flow.md`
// (four), `crew-routing.md` (two) and `hard-rules.md` (one). The comment used to
// describe a four-copy world inside one file; it now names the composed rules,
// the seven copies and the jobs they do. No assertion below was weakened to make
// that move — the number and the jobs are the same kind of claim, measured
// against the text that really carries them.

import { check, done, repoFile } from "../lib/qa.mjs";

const mount = repoFile("tools/verify-mount.mjs");

// The comment block around the count pin, taken from the sentence that carries
// the number to the failing line itself.
const start = mount.indexOf("appears SEVEN times");
check("the comment says `qa/gaps.md` appears SEVEN times", start !== -1, "the comment does not carry the count the composed PM rules really hold");
check("and it no longer says THREE times", !mount.includes("appears THREE times"), "the old, wrong number is still in the file");
check(
  "and it no longer says FOUR times",
  !mount.includes("appears FOUR times"),
  "the pre-V2 number is back. The copies moved out of roles/pm.md, so a comment claiming four copies in that one file is stale again — the exact failure this case exists for.",
);

if (start !== -1) {
  // The block runs from the sentence that carries the number to the pin's own
  // line. The end marker used to be the literal `copiesOf(section.text`; V2
  // changed the SUBJECT of the pin (it counts over the composed rules now), so
  // the marker is the call itself — what this block must end at — and not the
  // variable it happens to read.
  const block = mount.slice(start, mount.indexOf("copiesOf(", start));

  // Each copy gets a mention saying what work it does, named the way the PM
  // rules name them.
  const jobs = [
    { what: "step 10's review batching", pin: /step 10/ },
    { what: "step 11 staging the file", pin: /step 11[\s\S]{0,120}STAGES/ },
    { what: "step 18 filling it before a document is dropped", pin: /step 18[\s\S]{0,200}FILLS/ },
    { what: "the Hard rules summary restating the rule", pin: /\*\*Hard rules\*\*/ },
    { what: "the routing playbook naming the path twice", pin: /routing[\s\S]{0,40}playbook[\s\S]{0,200}twice/ },
  ];
  for (const job of jobs) {
    check(`the comment says what the copy in ${job.what} is for`, job.pin.test(block), block);
  }

  // And it says out loud that the threshold below it is a floor, not the count —
  // the sentence that stops the next reader from "fixing" the comment to match
  // the 3.
  check(
    "the comment says the threshold is a floor, not drift",
    /FLOOR|floor/.test(block),
    block,
  );
}

// The floor itself is still the one T-42's case pins, and the failing message
// still carries the substring that case anchors on.
//
// V2 (Crew V2): the threshold line reads the COMPOSED rules now — the core plus
// every playbook, `composePmRules()` — because `qa/gaps.md` moved into
// `roles/playbooks/`. The old subject, `section.text`, was the always-loaded
// prompt section alone; pinning that would demand the paths come back into the
// prompt, which is the thing V2 exists to stop. So the assertion is unchanged in
// what it proves — the count pin's threshold is still a floor of 3 — and only
// the text it is spelled against moved with the rule.
check(
  "the count pin still uses a floor of 3",
  mount.includes('copiesOf(pmRulesText, "qa/gaps.md") < 3'),
  "the threshold moved — qa/T-42/case-14 pins its message, so change both in one commit",
);
// A second copy of the pin, written against the always-loaded prompt section,
// would be the same rule asserted twice and would red the moment a copy moved
// out of the core. Asserted absent so it cannot come back by a partial revert.
// It is the other half of the check above: `pmRulesText` is `composePmRules()`
// (the core plus every playbook), and the copies live in `roles/playbooks/` now,
// so a pin switched back to the core alone would count zero and red a repository
// that is correct.
check(
  "and the pin is not also spelled against the always-loaded prompt section",
  !mount.includes('copiesOf(section.text, "qa/gaps.md")'),
  "the old subject is back — roles/pm.md no longer holds these copies (V2)",
);
check(
  "the failing message still contains `and it needs 3`",
  mount.includes("and it needs 3"),
  "qa/T-42/case-14-closing-migration-step-count.mjs anchors on that substring and would go red",
);

done();
