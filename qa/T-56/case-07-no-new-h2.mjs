// T-56 case-07, migrated to the V2 shape (Crew V2, item 1).
//
// The case used to pin one thing: `roles/pm.md` had exactly 14 top-level sections
// and carried the numbered steps 1..18, so a rewrite could not quietly add a
// heading or renumber a step that other files cite by number.
//
// V2 splits that file in two. The numbered flow moved into
// `roles/playbooks/crew-flow.md`, which the PM reads on demand, and the core kept
// the invariants and the routing. So the pin splits with it, and both halves are
// pinned rather than dropped:
//
//   * the CORE has exactly 10 top-level sections — the number is here so a new
//     always-loaded section is a decision somebody makes, not a side effect;
//   * the core carries NO numbered step at all: that is what "the flow is not in
//     the prompt" means, and it is the cheapest way to notice a flow creeping back;
//   * the composed rules still carry steps 1..18 with no gap and no repeat, because
//     every other file and every QA case cites them by number;
//   * the first line of the core is untouched.

import { check, done, pm, pmCore } from "../lib/qa.mjs";

const CORE_SECTIONS = 10;

const core = pmCore();
const coreHeadings = core.split("\n").filter((line) => line.startsWith("## "));
check(
  `the always-loaded core (roles/pm.md) has exactly ${CORE_SECTIONS} top-level sections`,
  coreHeadings.length === CORE_SECTIONS,
  `found ${coreHeadings.length}:\n      ${coreHeadings.join("\n      ")}`,
);

const coreSteps = core.split("\n").filter((line) => /^\d+\. \*\*/.test(line));
check(
  "the core carries no numbered step, so the flow really is on demand",
  coreSteps.length === 0,
  `the core holds ${coreSteps.length} numbered step(s): ${coreSteps.slice(0, 4).join(" | ")} — a step in the prompt is a step every turn pays for`,
);

const numbered = pm().split("\n").filter((line) => /^\d+\. \*\*/.test(line));
const numbers = numbered.map((line) => Number(line.match(/^(\d+)\./)[1]));
check(
  "the shipped rules still carry steps 1..18 with no gap and no repeat",
  numbers.length === 18 && numbers.every((number, index) => number === index + 1),
  `found ${numbers.length} step(s): ${numbers.join(", ")} — other files and QA cases cite these by number`,
);

check(
  "the first line of the core is untouched",
  core.split("\n")[0] === "# Crew role: product manager (PM)",
  `the title line reads ${JSON.stringify(core.split("\n")[0])} — qa/T-01/case-06 pins this too`,
);

done();
