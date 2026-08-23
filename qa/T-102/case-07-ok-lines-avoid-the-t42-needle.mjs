// T-102 DoD item 7, and T-100's version of the same rule: the two new `ok`
// lines must not carry the sentence four older QA cases match on.
//
// The trap, measured and not guessed. qa/T-42/case-06, -07, -08 and -16
// each break publish.yml's tag filter or its test gate and then assert that NO
// `ok` line still claims the folder is fine. They recognise such a line by one
// string: "workflow files under .github/workflows/ carry a live `npm publish`".
// T-100's first draft wrote an `ok` line containing that string. Its own pin was
// green through those mutations — a different question, correctly answered — so
// the sentence appeared, the four cases saw it, and all four went red over a
// file none of them was about.
//
// This case is what keeps that from coming back. It breaks publish.yml the way
// T-42 does, and requires two things at once: the needle appears in no `ok`
// line, AND the two new pins still say their piece. A new pin that fell silent
// to dodge the needle would be no better — it would stop reporting a fact that
// is still true.

import { check, done, tempRepo, runCheck, cleanUp, edit, expectRed, expectGreen, saidOk, okLines } from "../lib/qa.mjs";

const PUBLISH_YML = ".github/workflows/publish.yml";
// The exact string qa/T-42/case-06, -07, -08 and -16 look for.
const NEEDLE = "workflow files under .github/workflows/ carry a live `npm publish`";
const RELEASE_STEPS_OK = "the GitHub release steps are in place in";
const GRANTS_OK = "the release grants are in place in";
const TRIGGER = 'on:\n  push:\n    tags: ["v*"]\n';

// On a correct repository the needle belongs to exactly one `ok` line — the pin
// that owns it. Two would already be the collision.
const clean = tempRepo();
try {
  const run = runCheck(clean, "tools/verify-mount.mjs");
  expectGreen(run, "the untouched copy is green");
  check(
    "exactly one `ok` line carries the T-42 needle",
    okLines(run).filter((line) => line.includes(NEEDLE)).length === 1,
    okLines(run).filter((line) => line.includes(NEEDLE)).join("\n"),
  );
  check(
    "and it is not one of the two new ones",
    !okLines(run).some((line) => line.includes(NEEDLE) && (line.includes(RELEASE_STEPS_OK) || line.includes(GRANTS_OK))),
    okLines(run).filter((line) => line.includes(NEEDLE)).join("\n"),
  );
} finally {
  cleanUp(clean);
}

// The mutation T-42/case-06 makes: the publisher fires on every branch push.
const broken = tempRepo();
try {
  edit(broken, PUBLISH_YML, TRIGGER, "on: push\n");
  const run = runCheck(broken, "tools/verify-mount.mjs");
  expectRed(run, "publishes and has no v* tag filter on its push trigger", "a bare `on: push` on the publisher is red");

  // The half that broke four shipped cases.
  check(
    "no `ok` line carries the T-42 needle while the tag filter is broken",
    !saidOk(run, NEEDLE),
    okLines(run).filter((line) => line.includes(NEEDLE)).join("\n"),
  );

  // And the half that keeps the fix honest: the two new pins ask a different
  // question, that question is still answered yes, and they must go on saying
  // so. Silence would be the other way of dodging the needle, and a worse one.
  check(
    "the release-steps pin still reports its own green",
    saidOk(run, RELEASE_STEPS_OK),
    run.out,
  );
  check(
    "the release-grants pin still reports its own green",
    saidOk(run, GRANTS_OK),
    run.out,
  );
} finally {
  cleanUp(broken);
}

done();
