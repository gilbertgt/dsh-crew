// T-101 DoD items 4 and 5, as far as READING can go. Every check below is about
// the TEXT of the notes step's shell: which strings that shell contains. Not one
// of them observes the shell behaving.
//
// Every check name in this file therefore says "the shell text …". That is not
// pedantry. The green output of this case is what a person actually reads, and
// they read the check names, not these comments — so a name like "0.1.0 cannot
// match 0.10.0" would hand somebody the exact false belief this milestone is
// most at risk from: that the shell was tested. It was not.
//
// READ THIS BEFORE ADDING TO THIS FILE. Nothing here executes that shell, and
// nothing here may. The user chose that on 2026-08-22 (interview answer 6,
// section three of docs/design/prd-2026-08-22-gh-release.md): the PM offered a
// `tools/changelog-notes.mjs` that could be unit-tested, and a harness that
// would cut the `run:` block out and run it under bash, and both were turned
// down for simplicity. The hole that leaves is written down in docs/qa/gaps.md.
//
// So what a case can honestly say about that shell is only this: the pieces the
// contract named are present in the text. It CANNOT say the awk program is
// correct, that `0.1.0` really misses `## 0.10.0 — …`, that an empty section
// really exits non-zero, or that the last section of the file is read to the
// end. The first real run of that code is the first v* tag pushed after it
// landed. Do not let a green here be read as more than it is.

import { check, done, repoFile } from "../lib/qa.mjs";
import { publishSteps, stepNamed, shellOf, codeOnly } from "./steps.mjs";

const PUBLISH_YML = ".github/workflows/publish.yml";
const NOTES_STEP_NAME = "Read the release notes from CHANGELOG.md";

const steps = publishSteps(repoFile(PUBLISH_YML));
const notes = stepNamed(steps, NOTES_STEP_NAME);

check(`${PUBLISH_YML}: there is a step named "${NOTES_STEP_NAME}"`, Boolean(notes), steps.map((step) => step.label).join(" | "));

if (notes) {
  const shell = codeOnly(shellOf(notes));

  // The version comes from package.json. The step above already refused to go on
  // unless the tag and package.json agree, so reading the tag again here would
  // only add a second way for the two to disagree.
  check(
    `${PUBLISH_YML}: the shell text takes its version from package.json, not from the tag`,
    /require\(['"]\.\/package\.json['"]\)\.version/.test(shell),
    shell,
  );
  check(
    `${PUBLISH_YML}: the shell text names no \`GITHUB_REF_NAME\` (read, not run)`,
    !shell.includes("GITHUB_REF_NAME"),
    shell,
  );

  // The trailing space after the version is the whole reason `0.1.0` does not
  // match the `## 0.10.0 — …` heading. A prefix match with no space is the bug
  // this line exists to keep out, and it is invisible in a diff unless somebody
  // is looking for it.
  check(
    `${PUBLISH_YML}: the shell text searches for "## $VERSION " — the trailing space is there (nothing here runs it, so "0.1.0 cannot match 0.10.0" stays unverified)`,
    /"##\s\$VERSION\s"/.test(shell) || /'##\s\$VERSION\s'/.test(shell),
    shell,
  );

  check(`${PUBLISH_YML}: the shell text names CHANGELOG.md`, /\bCHANGELOG\.md\b/.test(shell), shell);
  check(
    `${PUBLISH_YML}: the shell text names \`release-notes.md\`, the file the release step reads (read, not run)`,
    /\brelease-notes\.md\b/.test(shell),
    shell,
  );

  // Interview answer 2: no section for this version has to stop the run while
  // the version can still be stopped. Not a warning, not a fallback to
  // auto-generated notes — a red run, before `npm publish`.
  check(
    `${PUBLISH_YML}: the shell text carries at least two \`::error::\` annotations (read, not run)`,
    (shell.match(/::error::/g) ?? []).length >= 2,
    `${(shell.match(/::error::/g) ?? []).length} occurrence(s)`,
  );
  check(
    `${PUBLISH_YML}: the shell text carries an \`exit 1\` on the failure paths (read, not run)`,
    /(^|\s)exit 1(\s|$)/m.test(shell),
    shell,
  );
  // The two named failures of DoD item 5 must be told apart in the message a
  // human reads at 2am: "no such section" and "the section is empty" are
  // different mistakes with different fixes.
  check(
    `${PUBLISH_YML}: the shell text has separate wording for "no such section" and "the section is empty" (read, not run)`,
    /no section/i.test(shell) && /empty/i.test(shell),
    shell,
  );
}

done();
