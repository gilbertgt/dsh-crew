// T-42, DoD item 5 (part 2): the doc review's `scope:` line, pinned in TWO files
// — the PM's rules (the PM sending the review) and roles/doc-reviewer.md (the
// reviewer reading its own rules). Lose it and a `pass` over one file reads,
// months later, exactly like a `pass` over the whole document set.
//
// WHERE THE PM'S COPY LIVES, AND WHY THAT CHANGED NOTHING HERE (Crew V2).
// `tools/verify-mount.mjs` pins the PM half against `composePmRules()` — the
// core plus the playbooks — because V2 moved the procedure out of the
// always-loaded prompt and into `roles/playbooks/`. The `ok`/`FAIL` line still
// names `roles/pm.md` (the pin's own wording, built from `PM_PERSONA_FILE`, and
// this case quotes it unchanged) but the text it reads is composed, and today
// both backticked copies sit in `roles/playbooks/crew-flow.md`. So the MUTATION
// moves with the text: editing `roles/pm.md` now throws "anchor not found", and
// a case that kept editing `roles/pm.md` would be breaking a file the pin no
// longer reads.
//
// The pin's spelling is what makes that matter. It is the BACKTICKED start of
// the line, not the bare word, because the flow says "It changes only through a
// CRD, like scope:" in step 3 — in the SAME playbook now — so a pin on the bare
// `scope:` would stay green with the whole instruction deleted. Dropping just
// the backtick must therefore still be red.

import { check, done, tempRepo, runCheck, cleanUp, editAll, expectRed, expectGreen, saidOk } from "../lib/qa.mjs";

const REGISTERED = "PM prompt section registered";
const failFor = (file) => `roles/${file} no longer tells the doc reviewer to open its report with a \`scope:\` line`;
const okFor = (file) => `roles/${file} carries the doc review's \`scope:\` line`;

// The PM half's `ok`/`FAIL` line names `roles/pm.md` (the pin's own wording), and
// that name is what the assertions below quote unchanged. The FILE the mutation
// has to break is the one that really holds the text: V2 moved the review steps
// into the playbook named here. A case that edits the core would break nothing
// the composed pin reads — a false green of exactly the kind V2 risked.
const PM_NAMED = "pm.md";
const PM_HOLDS = "roles/playbooks/crew-flow.md";
const pathOf = (file) => (file === PM_NAMED ? PM_HOLDS : `roles/${file}`);

const dir = tempRepo();
try {
  const base = runCheck(dir, "tools/verify-mount.mjs");
  expectGreen(base, "the untouched copy is green (so a red below is the mutation)");
  check(`the copy says: ok ${okFor("pm.md")}`, saidOk(base, okFor("pm.md")), base.out);
  check(`the copy says: ok ${okFor("doc-reviewer.md")}`, saidOk(base, okFor("doc-reviewer.md")), base.out);
} finally {
  cleanUp(dir);
}

for (const file of ["pm.md", "doc-reviewer.md"]) {
  // Red: the instruction gone from that one file. The other file still has it,
  // which is the point of pinning both — either one alone would let the rule be
  // deleted from the other and stay green.
  const dropped = tempRepo();
  try {
    editAll(dropped, pathOf(file), "`scope:", "the reader will work it out:");
    const run = runCheck(dropped, "tools/verify-mount.mjs");
    expectRed(run, failFor(file), `roles/${file} without the scope instruction is red`);
    check(`and no \`ok\` line claims roles/${file} carries it`, !saidOk(run, okFor(file)), run.out);
    check(`while the other file's \`ok\` line still prints`, saidOk(run, okFor(file === "pm.md" ? "doc-reviewer.md" : "pm.md")), run.out);
  } finally {
    cleanUp(dropped);
  }

  // Red: only the backtick removed. The word `scope:` is still in the text — the
  // PM's own copy says "It changes only through a CRD, like scope:" in step 3 as
  // well — so this is the false green the pin was deliberately spelled to avoid,
  // and it was measured in a copy before the pin was written.
  const unbacked = tempRepo();
  try {
    editAll(unbacked, pathOf(file), "`scope:", "scope:");
    expectRed(runCheck(unbacked, "tools/verify-mount.mjs"), failFor(file), `roles/${file} with the backtick dropped is red (the bare word is not the pin)`);
  } finally {
    cleanUp(unbacked);
  }
}

done();
