// T-101 DoD item 3 (M1 DoD item 3): design rule 7 of CLAUDE.md did not move.
// The publisher is still tag-only on push, and it still runs `npm test`
// unconditionally, in the same job, before it publishes.
//
// This is a case about a change that must NOT have happened. Two new steps and
// a widened `permissions:` block went into this file; the checks that already
// guard it live in tools/verify-mount.mjs and are read by docs/qa/T-42, and both
// of those could be edited by the same hand that edits the file. So the promise
// is read here once more, off the delivered file itself, with no pin in the way:
// host/git-guard.js lets a crew agent push an ordinary branch precisely BECAUSE
// this workflow is tag-only, so a `branches:` filter here would quietly turn
// every branch push into a release.

import { check, done, repoFile } from "../lib/qa.mjs";
import { publishSteps, stepNamed, keyRaw, publishStepOf, shellOf, codeOnly } from "./steps.mjs";

const PUBLISH_YML = ".github/workflows/publish.yml";
const text = repoFile(PUBLISH_YML);
const code = codeOnly(text);

// ---- the trigger: the `push:` block under `on:`
const on = /^["']?on["']?:[ \t]*$/m.exec(code);
check(`${PUBLISH_YML}: it has an \`on:\` block`, Boolean(on), code.slice(0, 200));

let push = "";
if (on) {
  const lines = code.slice(on.index).split("\n");
  const at = lines.findIndex((line) => /^[ \t]+push:[ \t]*$/.test(line));
  check(`${PUBLISH_YML}: \`on:\` has a \`push:\` trigger`, at !== -1, lines.slice(0, 8).join("\n"));
  if (at !== -1) {
    const indent = lines[at].search(/\S/);
    const body = [];
    for (const line of lines.slice(at + 1)) {
      if (line.trim().length === 0) continue;
      if (line.search(/\S/) <= indent) break;
      body.push(line);
    }
    push = body.join("\n");
  }
}

check(
  `${PUBLISH_YML}: the push trigger filters on a v* tag glob`,
  /^[ \t]*tags:/m.test(push) && /["']?v\*/.test(push),
  `push trigger body:\n${push}`,
);
check(
  `${PUBLISH_YML}: the push trigger names no branches — a branch push must never publish`,
  !/^[ \t]*branches(?:-ignore)?:/m.test(push),
  `push trigger body:\n${push}`,
);

// ---- the test gate, before the publish and with no `if:` on it
const steps = publishSteps(text);
const checksStep = stepNamed(steps, "Run checks");
const publishStep = publishStepOf(steps);

check(`${PUBLISH_YML}: there is a \`Run checks\` step`, Boolean(checksStep), steps.map((step) => step.label).join(" | "));
if (checksStep) {
  check(
    `${PUBLISH_YML}: \`Run checks\` runs \`npm test\``,
    /(^|\s)npm test(\s|$)/.test(shellOf(checksStep)),
    shellOf(checksStep),
  );
  check(
    `${PUBLISH_YML}: \`Run checks\` has no \`if:\` — the suite runs on every tag, not only when publishing`,
    keyRaw(checksStep, "if") === null,
    `if is ${JSON.stringify(keyRaw(checksStep, "if"))}`,
  );
  // Design rule 7 asks for the suite before the publish AND in the same job.
  // This case reads only the first half — a line-number comparison — and that is
  // enough here for one reason: `publishSteps()` walks the steps of a single
  // job, so both steps it compared came out of the same one. What it does NOT
  // do is check that the file still HAS only one job; that is
  // case-04-permissions-and-one-job.mjs, and nothing in this file reads it. Two
  // jobs and this comparison would be meaningless, which is why the two cases
  // are worth having side by side.
  check(
    `${PUBLISH_YML}: \`Run checks\` runs BEFORE \`npm publish\`, in the one job \`publishSteps()\` walked`,
    checksStep.line < publishStep.line,
    `Run checks on line ${checksStep.line + 1}, the publish on line ${publishStep.line + 1}`,
  );
}

// Provenance is the other thing about this publish that must not quietly go
// away: it is what ties the published tarball to this workflow run, and it costs
// nothing to keep an eye on while the file is being changed around it.
check(
  `${PUBLISH_YML}: the publish still carries \`--provenance\``,
  /npm publish[^\n]*--provenance/.test(codeOnly(shellOf(publishStep))),
  shellOf(publishStep),
);

done();
