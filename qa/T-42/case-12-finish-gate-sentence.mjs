// T-42, DoD item 5 (part 1): step 10's finish gate is pinned by
// `tools/verify-mount.mjs`, and both directions of that pin really go red.
//
// WHERE THE RULE LIVES, AND WHY THAT CHANGED NOTHING HERE (Crew V2).
// This case used to mutate `roles/pm.md`, because that file was every rule there
// was. V2 split the PM's rules: `roles/pm.md` is the always-loaded core and the
// numbered flow — step 10 among its steps — moved to
// `roles/playbooks/crew-flow.md`. The gate did NOT disappear and the pin did not
// weaken: `tools/verify-mount.mjs` judges the COMPOSED rules
// (`composePmRules()`), so it still fires wherever the sentence lives, and this
// case is about the pin, not about which file the sentence sits in.
//
// So the anchor moves to the file that really holds it, and that is not a
// cosmetic edit: an `edit()` against `roles/pm.md` now throws "anchor not found",
// and a case that kept reading `roles/pm.md` would be asserting about a file the
// gate is no longer in. `FLOW` below is `roles/playbooks/crew-flow.md`; a check
// states out loud that `roles/pm.md` does NOT hold the sentence, so if core and
// playbook are ever swapped back the anchor is corrected rather than left
// pointing at the wrong file.
//
// This is the rule the crew actually broke: about twenty tasks of this job were
// called done with no code review at all, and nothing in the system noticed —
// the user had to ask. The sentence carries no path and no command, so the pin
// is prose and brittle on purpose (ADR 0004, ADR 0007): a legitimate reword
// edits the prompt and the pinned string in the same commit.
//
// WHAT CHANGED HERE, AND WHY IT IS A DECISION AND NOT DRIFT.
// **T-65** (apply-req job) replaced the gate itself. The old one was
// `A task is finished when code review passes`, and it went on to require a
// security review passed or skipped for a stated reason, and QA saying pass —
// three checks. The new one is `A task is finished when its own unit tests pass`.
// It is a decision, and it was written down before it happened:
//
//   * `docs/decisions/crd/0020-apply-req-speed-items.md` item 1 moved QA and the
//     three reviews out of the per-task loop: they run once per milestone, at the
//     end of it. So the old gate waited on three things that have not run when a
//     task is handed in — it could never be met, and it made EVERY task
//     unfinishable, which is worse than the hole it was written to close;
//   * the PRD of this job carries it as A1c, and B4 beside it — B4 says in as
//     many words that A1c rewrites the definition of "done", so the two land in
//     one task;
//   * `principles.md` principle 6 already says the same thing in its own words
//     ("And this is what finishes a task"), including that the bar for done is
//     deliberately lower now and what that trade costs (principle 18);
//   * `docs/decisions/adr/0018-red-existing-cases.md` decided who edits this
//     assertion: QA, in the same commit as the prose, so no commit is red and
//     `qa/` stays QA's. T-65's DoD item 8 is the box for that work.
//
// STILL TRUE, AND KEPT: the old gate was real, and until CRD 0020 it was the
// honest reading of step 10 — three checks, and the reason it existed was the
// twenty ungated tasks above. The only untrue part was the inference "so those
// three checks are what finishes a task forever".
//
// THE FILE NAME still says `finish-gate-sentence`, which is what this case is
// about either way, so nothing to rename.
//
// WHAT IS NEW BELOW, AND WHY IT IS A STRENGTHENING. T-65 gave the check TWO pins
// where it had one: the new sentence must be PRESENT, and the old sentence must
// be ABSENT, so the unmeetable three-check gate cannot come back by accident.
// This case used to prove one pin with two mutations; it now proves both with
// three. The third mutation adds the old sentence back BESIDE the new one, on
// purpose: the two pins are an `else if` chain, so the absence pin is only ever
// reached while the presence pin is satisfied.
//
// WHAT THIS CASE DOES NOT COVER, on purpose. Step 10 also says the Verdicts line
// still carries four values and that a check which has not run is `not run` with
// a reason, never `pass`. `verify-mount.mjs` pins none of that — it lives in the
// failure message as prose only — so there is no red here to prove. That half is
// pinned directly in `qa/T-56/case-08-existing-pins-intact.mjs`, which is
// the insurance file for what nothing else pins.

import { check, done, tempRepo, runCheck, cleanUp, copyFile, edit, expectRed, expectGreen, saidOk } from "../lib/qa.mjs";

const GATE = "A task is finished when its own unit tests pass";
const OLD_GATE = "A task is finished when code review passes";
const FAIL = "PM section is missing `A task is finished when its own unit tests pass`";
const FAIL_OLD = "PM section still says `A task is finished when code review passes`";
const REGISTERED = "PM prompt section registered";
// V2: the core plus the playbook that holds the numbered flow. See the header.
const CORE = "roles/pm.md";
const FLOW = "roles/playbooks/crew-flow.md";

const dir = tempRepo();
try {
  const base = runCheck(dir, "tools/verify-mount.mjs");
  expectGreen(base, "the untouched copy is green (so the red below is the mutation)");
  check(`the copy says: ok ${REGISTERED}`, saidOk(base, REGISTERED), base.out);
  // The anchor is only meaningful where the sentence really is. The pin reads the
  // composed rules, so the sentence may live in either half; these two checks say
  // which half holds it today and send the mutations to that file.
  check(`the numbered flow (${FLOW}) holds the finish gate`, copyFile(dir, FLOW).includes(GATE), FLOW);
  check(`the always-loaded core (${CORE}) does not hold it, so the mutation below targets a file the pin really reads`, !copyFile(dir, CORE).includes(GATE), CORE);
} finally {
  cleanUp(dir);
}

// Red: the sentence reworded. Nothing else about step 10 changes, so this is the
// smallest edit that loses the gate.
const reworded = tempRepo();
try {
  edit(reworded, FLOW, GATE, "A task is done when its own unit tests pass");
  const run = runCheck(reworded, "tools/verify-mount.mjs");
  expectRed(run, FAIL, "the finish gate reworded is red");
  check("and the PM prompt section is not reported as registered", !saidOk(run, REGISTERED), run.out);
} finally {
  cleanUp(reworded);
}

// Red: the whole sentence deleted.
const deleted = tempRepo();
try {
  edit(deleted, FLOW, GATE, "");
  expectRed(runCheck(deleted, "tools/verify-mount.mjs"), FAIL, "the finish gate deleted is red");
} finally {
  cleanUp(deleted);
}

// Red: the old three-check gate brought back. The new sentence stays, so the
// presence pin passes and the absence pin is the one that has to fire — that is
// the only way to reach the second pin at all.
const restored = tempRepo();
try {
  edit(restored, FLOW, GATE, `${GATE}. ${OLD_GATE}`);
  const run = runCheck(restored, "tools/verify-mount.mjs");
  expectRed(run, FAIL_OLD, "the old three-check gate put back beside the new one is red");
  check("and the FAIL says why that gate can no longer be met", run.out.includes("CRD 0020 replaced"), run.out);
} finally {
  cleanUp(restored);
}

done();
