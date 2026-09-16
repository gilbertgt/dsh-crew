// dsh-crew playbooks: the flows the PM reads on demand.
//
// V2 splits the PM rules in two. `roles/pm.md` is the CORE: the invariants, the
// permissions, the routing judgement and the two shapes a `solo` job moves
// through. It is small enough to sit in front of the PM on every turn, and it is
// the only part that is always loaded.
//
// Everything procedural — the numbered crew flow, the document ceremony, the
// decision records, the job ledger, the paired shape and the long rule list —
// lives in `roles/playbooks/`. The PM reads one with `read` at the moment the job
// needs it, and nothing else.
//
// This module is the single source of truth for that list, because three things
// have to agree about it and none of them may drift:
//   - the index the PM reads (`roles/pm.md` names every playbook and when to read
//     it; `tools/verify-mount.mjs` checks the two agree);
//   - the tooling that judges the rules as a whole (`composePmRules`, used by
//     `tools/verify-mount.mjs` and `qa/lib/qa.mjs`);
//   - the shipped package (`package.json`'s `files` names `roles`).
//
// A case or a tool that must know where a rule LIVES reads the core alone
// (`roles/pm.md`). A case or a tool that only cares that the rule still SHIPS
// reads `composePmRules()`. That split is deliberate: it is what lets the flows
// move out of the prompt without a single rule being lost, and it keeps the
// always-loaded half honest about being small.

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** The always-loaded core of the PM rules. */
export const PM_CORE_PATH = join(PACKAGE_ROOT, "roles", "pm.md");
/** Folder holding the on-demand playbooks. */
export const PLAYBOOKS_DIR = join(PACKAGE_ROOT, "roles", "playbooks");
/** The largest the always-loaded core may grow to, in bytes. */
export const PM_CORE_MAX_BYTES = 20 * 1024;

/**
 * Every playbook, in the order `composePmRules` concatenates them.
 *
 * `when` is the condition the PM reads in the index, and it is written once here
 * so the index and the check that reads it cannot disagree. `file` is relative to
 * `roles/playbooks/`.
 */
export const PLAYBOOKS = [
  {
    file: "crew-flow.md",
    when: "the route is `crew`, or a `solo` job needs a role beyond its one engineer",
    holds: "the numbered flow: interview, PRD, task table, design, task runs, checks, commit, milestone review, release plans, reader-facing files, push, merge, finish",
  },
  {
    file: "crew-routing.md",
    when: "the short routing rules in the core are not enough to place the work",
    holds: "the long form of the routing judgement: what the scale decides, the two questions kept apart, and the three lines that say who owns which piece of work",
  },
  {
    file: "documents.md",
    when: "a job must write an opening document, a task table or a task row",
    holds: "the opening document, the task table and its rows, and the write set by document class",
  },
  {
    file: "bug-rows.md",
    when: "a bug on the `crew` or `solo` route is about to be fixed",
    holds: "what a bug's task row holds, and who writes it",
  },
  {
    file: "decisions.md",
    when: "a decision or a change request needs its own record",
    holds: "change requests (CRD), decisions about how (ADR), and who decides each",
  },
  {
    file: "worktrees.md",
    when: "a task runs on the paired shape",
    holds: "two engineers, two git worktrees, one pinned interface, one first meeting",
  },
  {
    file: "crew-state.md",
    when: "the job has a folder, or a restart notice names an unfinished job",
    holds: "`state.json`, the stage checkpoints, the `Q-` files, and what a restart repeats",
  },
  {
    file: "hard-rules.md",
    when: "you are unsure which rule a case falls under",
    holds: "every hard rule in one list",
  },
];

/** Read one playbook by file name. Throws when it is missing or empty. */
export function readPlaybook(file) {
  const path = join(PLAYBOOKS_DIR, file);
  const text = readFileSync(path, "utf8").trim();
  if (text.length === 0) throw new Error(`dsh-crew: playbook "${path}" is empty`);
  return text;
}

/** Read the always-loaded core. */
export function readPmCore() {
  return readFileSync(PM_CORE_PATH, "utf8");
}

/**
 * The core plus every playbook, in one string.
 *
 * This is what "the rules still ship" means in a check: a sentence that moved into
 * a playbook is still in here, so a pin on it keeps meaning something without
 * forcing the sentence back into the prompt. It is deliberately NOT what dsh
 * loads — dsh loads the core alone.
 */
export function composePmRules() {
  return [readPmCore().trim(), ...PLAYBOOKS.map((playbook) => readPlaybook(playbook.file))].join("\n\n");
}
