// Pins the adaptive routing added to the PM and role prompts. The old checks
// protect the crew plumbing; this one protects the decision not to invoke it
// when a small change needs no second role.

import { check, done, flat, repoFile } from "../lib/qa.mjs";

const pm = flat(repoFile("roles/pm.md"));

check("direct is the default for a small low-risk change", /`direct` — \*\*the default for a small, low-risk change/i.test(pm));
check("direct starts no child role", /start \*\*no\*\* child role/i.test(pm));
check("crew is selected for module boundaries and the risky list", /crosses a module boundary/i.test(pm) && /risky list/i.test(pm));
check("unrelated roles are not started", /role whose subject this change never touched is not started/i.test(pm));
check("the current executor fixes small failures before escalation", /Fix it yourself before you escalate it/i.test(pm));
check("iteration uses targeted tests and full gates once", /run the targeted tests, not the whole suite/i.test(pm) && /completion gates/i.test(pm));
check("one issue stops after two review rounds", /initial review is round one/i.test(pm) && /round two/i.test(pm) && /Do not open a third round/i.test(pm));
check("state checkpoints skip finished work", /`stages` is the reason a resumed session does not do the work twice/i.test(pm) && /skip every step whose entry is `done` or `skipped`/i.test(pm));

for (const file of ["code-reviewer.md", "security-reviewer.md", "doc-reviewer.md"]) {
  const text = flat(repoFile(`roles/${file}`));
  check(`${file} does not block on unrelated test scaffolding`, /fixture, fake, snapshot updater or verification script/i.test(text) && /unless it invalidates the evidence/i.test(text));
  check(`${file} stops the same issue after two review rounds`, /One issue gets two review rounds/i.test(text) && /Open no third round/i.test(text));
}

for (const file of ["engineer.md", "test-engineer.md", "code-engineer.md", "qa.md"]) {
  const text = flat(repoFile(`roles/${file}`));
  check(`${file} uses targeted work before the completion gate`, /targeted|narrowest command|one case/i.test(text) && /completion gate/i.test(text));
}

done();