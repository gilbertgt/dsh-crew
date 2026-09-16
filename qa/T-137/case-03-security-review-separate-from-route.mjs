// T-137 DoD item 3 — "does this need a security review?" is answered separately
// from "how much crew does this get?", and taking user input is not by itself a
// risky change.
//
// What went wrong, in one sentence: the closed risky list that decides whether a
// security review is needed also contained "input that comes from a user", and the
// same wording sat in the list that decided whether the whole crew was opened. So
// every ordinary settings form, dropdown and search box in the product read as a
// risky change, and the crew escalated to the full set of roles for a screen whose
// only crime was having a text field. The two questions were never the same
// question — one is about how many roles, the other about one reviewer — and this
// case keeps them apart:
//
//   * the crew-trigger passage names no input at all;
//   * the rules say in their own sentence that a screen which merely TAKES
//     input is not a risky change;
//   * the security list keeps the trust-boundary wording instead, so the review
//     still fires where it earns its keep — a query, a shell command, a file path,
//     a parser, a rendered page — plus the network, a login, secrets and a new
//     dependency;
//   * the PM is told the order to ask the two questions in, and that the second
//     one never moves the route.
//
// Everything is judged on FLATTENED text. The rules wrap at about 80 columns and
// the sentence this task added really does wrap; a line-by-line grep for it matches
// nothing whether the rule is there or not.
//
// The mutations put the old wording back, one place at a time, and demand the run
// go red: `input` restored to the crew triggers, and the "taking input is not
// risky" sentence turned around, and the trust-boundary wording dropped.
//
// Reads the repository; writes only inside throwaway copies, which it removes.
//
// V2: the rules are read as ONE text — the always-loaded `roles/pm.md` plus every
// playbook — because that is what "the rules still say X" means now that the
// security list lives in `roles/playbooks/crew-flow.md`. `pm()` is that text for
// the real run, and every mutation reads its own copy back through
// `composePmRulesIn(dir)`: a mutation written into a playbook and then judged
// against the real core alone would stay green while proving nothing. The "not a
// risky change" sentence is carried by TWO files (the core and
// `roles/playbooks/crew-routing.md`), so the mutation that reverses it edits both
// — one copy left standing would still ship the rule, and the check would rightly
// stay green.

import { check, cleanUp, composePmRulesIn, done, edit, flat, pm, tempRepo } from "../lib/qa.mjs";

const CREW_TRIGGERS_START = "Choose `crew` when any one of these is true";
const SECURITY_QUESTION = "Is a security review needed";
const RISKY_SENTENCE = "A screen that merely TAKES input from the user is not a risky change.";
const RISKY_ANCHOR = "A screen that merely TAKES input from the user is not a risky";
const LIST_SENTENCE = "Taking input is not on this list by itself";

/** The passage holding the crew triggers, from its opening sentence to the next paragraph. */
function crewTriggerPassage(text) {
  const start = text.indexOf(CREW_TRIGGERS_START);
  if (start === -1) return "";
  const rest = text.slice(start);
  const end = rest.indexOf(SECURITY_QUESTION);
  return flat(end === -1 ? rest.slice(0, 1200) : rest.slice(0, end));
}

/** The passage holding step 10b's closed security list. */
function securityListPassage(text) {
  const start = text.indexOf("10b. Security review");
  if (start === -1) return "";
  const rest = text.slice(start);
  const end = rest.indexOf("If you are not sure whether it counts");
  return flat(end === -1 ? rest.slice(0, 1600) : rest.slice(0, end));
}

const ID = {
  triggerNoInput: "the crew triggers name no user input at all",
  riskySentence: "step 1 says a screen that only takes input is not a risky change",
  listNoBareInput: "step 10b says taking input is not on its own list",
  listBoundary: "step 10b keeps the trust-boundary wording instead",
  listIntact: "step 10b's other triggers are still there",
  order: "the PM is told which question to ask first, and that security never moves the route",
  tableColumn: "the routing table has a Security review column of its own",
};

function audit(text) {
  const results = [];
  const add = (id, ok, detail = "") => results.push({ id, ok, detail });

  const whole = flat(text);
  const triggers = crewTriggerPassage(text);
  const security = securityListPassage(text);

  add(
    ID.triggerNoInput,
    triggers !== "" && !/\binput\b/i.test(triggers),
    triggers === ""
      ? `the crew-trigger passage was not found, so this could not be judged: starting from ${JSON.stringify(CREW_TRIGGERS_START)}`
      : `the crew triggers still mention input, which is the reading this task removed: ${JSON.stringify(triggers.slice(0, 400))}`,
  );
  add(
    ID.riskySentence,
    whole.includes(RISKY_SENTENCE),
    `the rules do not carry ${JSON.stringify(RISKY_SENTENCE)}, so "takes input" is still open to being `
      + "read as a risky change",
  );
  add(
    ID.listNoBareInput,
    whole.includes(LIST_SENTENCE),
    `step 10b no longer says ${JSON.stringify(LIST_SENTENCE)}`,
  );
  add(
    ID.listBoundary,
    /user input that reaches a trust boundary/i.test(security)
      && /a query, a shell command, a file path, a parser, a rendered page/i.test(security),
    "step 10b's security list lost its trust-boundary wording, so the review either fires on every form or "
      + `on nothing: ${JSON.stringify(security.slice(0, 400))}`,
  );
  add(
    ID.listIntact,
    ["the network", "a login or permission check", "secrets or keys", "customer data", "a new dependency"]
      .every((trigger) => security.toLowerCase().includes(trigger)),
    "step 10b's list lost one of its other triggers, and a security review that cannot fire is worse than "
      + `no list at all: ${JSON.stringify(security.slice(0, 400))}`,
  );

  // Both decisions, in the order the PM has to ask them, in one passage.
  const orderStart = text.indexOf("That is the second question");
  const order = orderStart === -1 ? "" : flat(text.slice(orderStart, orderStart + 1400));
  add(
    ID.order,
    /the route\b/i.test(order)
      && /the security review\b/i.test(order)
      // V2 tightened this: security never forces the CREW route, but it does raise
      // a `direct` change to `solo`, because a reviewer is a child and `direct`
      // starts none. The assertion moved with the rule and gained that half.
      && /never forces the `crew` route by itself/i.test(order)
      && /`direct` change whose\s+answer is yes is a `solo` change/i.test(order),
    `the passage that orders the two questions is missing, or it no longer says how far the security answer can move the route: ${JSON.stringify(order.slice(0, 400))}`,
  );
  add(
    ID.tableColumn,
    /\|\s*route\s*\|\s*security review\s*\|/i.test(text),
    "the routing table has no Security review column of its own, so the two answers are not shown apart",
  );

  return results;
}

// ------------------------------------------------------------- the real file

const text = pm();
for (const result of audit(text)) check(result.id, result.ok, result.detail);

// The one place the old wording may still legitimately appear: nowhere. This is
// printed either way, flattened and line by line, because a wrapped copy of it is
// what a line-based scan misses.
const OLD = "input that comes from a user";
const occurrences = flat(text).toLowerCase().split(OLD).length - 1;
const byLine = text.toLowerCase().split("\n").filter((line) => line.includes(OLD)).length;
console.log(`      "${OLD}" in the PM rules: ${occurrences} flattened, ${byLine} line by line`);
check(
  `the old crew trigger "${OLD}" is gone from the PM rules`,
  occurrences === 0,
  `${occurrences} occurrence(s) flattened, ${byLine} line by line`,
);

// -------------------------------------------------------------- mutations

/** Break one file of a fresh copy and return which audit checks failed. */
function afterBreaking(breakIt) {
  const dir = tempRepo();
  try {
    breakIt(dir);
    return audit(composePmRulesIn(dir)).filter((result) => !result.ok).map((result) => result.id);
  } finally {
    cleanUp(dir);
  }
}

// Mutation 1: put the old trigger back into the crew-trigger passage. That
// passage is one of the rules that stayed in the always-loaded core.
const triggerBack = afterBreaking((dir) => {
  edit(
    dir,
    "roles/pm.md",
    "- it is a data migration, a release, a new dependency, or an architecture",
    "- input that comes from a user;\n- it is a data migration, a release, a new dependency, or an architecture",
  );
});
check(
  "mutation 1: putting user input back into the crew triggers turns this case red",
  triggerBack.includes(ID.triggerNoInput),
  `failed checks were ${JSON.stringify(triggerBack)}`,
);

// Mutation 2: the sentence that separates taking input from being risky is turned
// around, so "takes input" is open to being read as risky again.
//
// V2: the sentence ships in the core AND in `roles/playbooks/crew-routing.md`, and
// the audit judges the two composed into one text — so BOTH copies have to go, or
// the rule would still ship and the check would (rightly) stay green. The anchor
// stops short of the sentence's end because the playbook's copy wraps in the
// middle of it.
const RISKY_CARRIERS = ["roles/pm.md", "roles/playbooks/crew-routing.md"];
const RISKY_TURNED = "A screen that merely TAKES input from the user is a risky";
const sentenceGone = afterBreaking((dir) => {
  for (const file of RISKY_CARRIERS) edit(dir, file, RISKY_ANCHOR, RISKY_TURNED);
});
check(
  'mutation 2: turning "takes input is not a risky change" around turns this case red',
  sentenceGone.includes(ID.riskySentence),
  `failed checks were ${JSON.stringify(sentenceGone)}`,
);

// Mutation 3: the trust-boundary wording is dropped, so the list is back to
// reading any input as a risk.
const boundaryGone = afterBreaking((dir) => {
  edit(
    dir,
    "roles/playbooks/crew-flow.md",
    "**user input that reaches a trust boundary** — a query, a shell\n   command, a file path, a parser, a rendered page —",
    "input that comes from a user,",
  );
});
check(
  "mutation 3: dropping the trust-boundary wording turns this case red",
  boundaryGone.includes(ID.listBoundary) && boundaryGone.includes(ID.triggerNoInput) === false,
  `failed checks were ${JSON.stringify(boundaryGone)} — the list must lose its boundary wording and go red `
    + "on that check alone",
);

done();
