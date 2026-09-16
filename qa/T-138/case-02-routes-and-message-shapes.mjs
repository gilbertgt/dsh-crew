// T-138 (Crew V2) — the three routes, the number of children each one starts,
// and the two message shapes a `solo` job moves through.
//
// V2's second half is routing. The old prompt let one lane cover everything: a
// change could reach the repository with a whole crew behind it, or with nothing
// written down and nothing checking it. V2 separates the three routes in the
// always-loaded core and gives each one its own rules — and it puts the two
// shapes of a `solo` job (TaskBrief out, Result back) in the core too, because
// they are what the PM and its one engineer actually exchange.
//
// What this case proves, all of it read out of the core the PM really carries:
//
//   1. `direct` starts NO child role and writes none of the crew's documents;
//   2. `solo` starts exactly ONE `crew_engineer`, plus at most one named reviewer;
//   3. `crew` is the route the numbered flow belongs to;
//   4. whether a security review is needed is a SECOND question, and it never
//      moves the route by itself;
//   5. TaskBrief carries its fields (with `artifact paths` optional), and Result its five;
//   6. a blocker on `solo` goes back to the SAME continuable engineer.
//
// Three breakages in throwaway copies prove the assertions have teeth: a `solo`
// that starts two engineers, a `direct` that starts a child, and a TaskBrief
// missing a field must each turn this case red.

import { join } from "node:path";

import { check, done, flat, tempRepo, cleanUp, copyFile, edit, REPO, pmCore } from "../lib/qa.mjs";

/** Every check, as a pure function of the core text, so the mutations reuse it. */
function audit(raw) {
  const text = flat(raw);
  const has = (needle) => text.includes(flat(needle));
  const results = [];
  const add = (id, ok, detail) => results.push({ id, ok, detail });

  add(
    "direct: the PM starts NO child role on this route",
    has("You do the work in this session and start **no** child role"),
    "the direct bullet no longer says the PM does the work itself. A `direct` change that starts a role "
      + "is a `solo` change wearing the wrong name, and the user's own routing decision stops meaning "
      + "anything.",
  );
  add(
    "direct: it is the only route that skips the flow, and it skips all of it",
    has("no Socratic interview (step 2), no PRD, no HLD, no ADR, no CRD, no design document, no architect, no task rows in `docs/tasks/`, no QA case folder, no review round"),
    "the list of what `direct` skips is the whole point of the route: a route with no documents and no "
      + "checks is only acceptable because the list is closed and visible. A missing item is a document "
      + "somebody will write on a `direct` change.",
  );
  add(
    "solo: exactly ONE crew_engineer, plus at most one more role",
    has("You start **one** `crew_engineer`, and at most one more role"),
    "the child count is the contract of this route. Two engineers is `crew` work priced as `solo`, and "
      + "the user was never asked.",
  );
  add(
    "solo: the TaskBrief is its whole contract, with no other document behind it",
    has("On `solo` the TaskBrief is the whole contract."),
    "the TaskBrief is what `solo`'s engineer reads instead of a PRD and a task row. Without this "
      + "sentence the route reads as if the engineer had something else to go on, and a briefing then "
      + "sends it looking for documents that do not exist.",
  );
  add(
    "solo: it runs no interview and opens no PRD",
    has("**`solo` runs no interview and opens no PRD.**"),
    "an interview and an opening document are `crew` ceremony. A `solo` job that opens one has quietly "
      + "become the route it was meant to avoid.",
  );
  add(
    "crew: the numbered flow is this route's flow",
    has("`crew` — the numbered flow below, unchanged"),
    "the numbered steps have to name the route they belong to, or `solo` and `direct` read as if they "
      + "owed them too.",
  );
  add(
    "the security review is a second question and never moves the route by itself",
    has("Is a security review needed? That is the second question, and it never moves the route by itself."),
    "V2 keeps the two judgements apart on purpose: `solo` plus one security review is a normal outcome, "
      + "and a route that changes because a form takes input is a crew nobody asked for.",
  );
  add(
    "TaskBrief carries its fields, and its artifact path is optional",
    has("`goal` (one sentence); `files` (the exact files the engineer may touch); `acceptance` (the checks that must pass, each one runnable); `constraints` (what must not change); `test` (the test file to write and the exact")
      && has("and `artifact paths`, **which is optional and usually absent**")
      && has("a `solo` job has no job folder to put one in"),
    "the fields are the briefing contract, and `artifact paths` is the one of them a `solo` job "
      + "usually does not have: with no job folder there is nowhere to put one, so the Result in the "
      + "message is the whole record unless the PM names a path on purpose.",
  );
  add(
    "Result carries its five fields",
    has("`status` (`done`, `blocked` or `failed`); `changed files`; `tests` (the command and its real exit status); `blocker` (one sentence, when blocked); `remaining risk` (what it did not cover)."),
    "the five fields are what the PM reports to the user from. A missing one turns a report into a "
      + "guess, and the user is the one who cannot tell.",
  );
  add(
    "a solo blocker goes back to the SAME engineer",
    has("`solo`: answer the same engineer, never a new one."),
    "the continuable child is the whole reason `solo` is cheap: its context is the job. A second "
      + "engineer throws that away and starts the task again from a message.",
  );

  return results;
}

const core = pmCore();
for (const result of audit(core)) check(result.id, result.ok, result.detail);

// ---------------------------------------------------------------- mutations

/** Break one file of a fresh copy and return which audit checks failed. */
function afterBreaking(relative, from, to) {
  const dir = tempRepo();
  try {
    edit(dir, relative, from, to);
    return audit(copyFile(dir, relative)).filter((result) => !result.ok).map((result) => result.id);
  } finally {
    cleanUp(dir);
  }
}

const twoEngineers = afterBreaking(
  "roles/pm.md",
  "You start **one**\n  `crew_engineer`, and at most one more role",
  "You start **two**\n  `crew_engineer`s, and at most one more role",
);
check(
  "mutation 1: a solo that starts two engineers turns this case red",
  twoEngineers.includes("solo: exactly ONE crew_engineer, plus at most one more role")
    && twoEngineers.length === 1,
  `failed checks were ${JSON.stringify(twoEngineers)} — exactly the child-count check is expected: more `
    + `than one means another assertion is reading the same number, none means the count is not really `
    + `pinned.`,
);

const directStartsAChild = afterBreaking(
  "roles/pm.md",
  "You do the work in\n  this session and start **no** child role.",
  "You do the work in\n  this session and start **one** child role.",
);
check(
  "mutation 2: a direct that starts a child turns this case red",
  directStartsAChild.includes("direct: the PM starts NO child role on this route")
    && directStartsAChild.length === 1,
  `failed checks were ${JSON.stringify(directStartsAChild)}`,
);

const missingField = afterBreaking(
  "roles/pm.md",
  "`constraints` (what must not change); ",
  "",
);
check(
  "mutation 3: a TaskBrief missing a field turns this case red",
  missingField.includes("TaskBrief carries its fields, and its artifact path is optional") && missingField.length === 1,
  `failed checks were ${JSON.stringify(missingField)}`,
);

console.log(`      core read from ${join(REPO, "roles", "pm.md")}: ${core.length} characters`);
done();
