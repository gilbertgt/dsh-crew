// T-101 DoD items 4 and 5, as far as reading can go: the notes step takes its
// version from package.json, matches a heading that ends in a SPACE, writes
// `release-notes.md`, and refuses loudly instead of going green.
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
    `${PUBLISH_YML}: the notes step reads the version from package.json`,
    /require\(['"]\.\/package\.json['"]\)\.version/.test(shell),
    shell,
  );
  check(
    `${PUBLISH_YML}: the notes step does not read the version off the tag (\`GITHUB_REF_NAME\`)`,
    !shell.includes("GITHUB_REF_NAME"),
    shell,
  );

  // The trailing space after the version is the whole reason `0.1.0` does not
  // match the `## 0.10.0 — …` heading. A prefix match with no space is the bug
  // this line exists to keep out, and it is invisible in a diff unless somebody
  // is looking for it.
  check(
    `${PUBLISH_YML}: it matches the heading \`## <version><SPACE>\`, so 0.1.0 cannot match 0.10.0`,
    /"##\s\$VERSION\s"/.test(shell) || /'##\s\$VERSION\s'/.test(shell),
    shell,
  );

  check(`${PUBLISH_YML}: it reads CHANGELOG.md`, /\bCHANGELOG\.md\b/.test(shell), shell);
  check(
    `${PUBLISH_YML}: it writes the notes to \`release-notes.md\`, the file the release step reads`,
    /\brelease-notes\.md\b/.test(shell),
    shell,
  );

  // Interview answer 2: no section for this version has to stop the run while
  // the version can still be stopped. Not a warning, not a fallback to
  // auto-generated notes — a red run, before `npm publish`.
  check(
    `${PUBLISH_YML}: it reports failure through \`::error::\`, so the run annotates what went wrong`,
    (shell.match(/::error::/g) ?? []).length >= 2,
    `${(shell.match(/::error::/g) ?? []).length} occurrence(s)`,
  );
  check(
    `${PUBLISH_YML}: it exits non-zero rather than going green with no notes`,
    /(^|\s)exit 1(\s|$)/m.test(shell),
    shell,
  );
  // The two named failures of DoD item 5 must be told apart in the message a
  // human reads at 2am: "no such section" and "the section is empty" are
  // different mistakes with different fixes.
  check(
    `${PUBLISH_YML}: its messages tell "no such section" apart from "the section is empty"`,
    /no section/i.test(shell) && /empty/i.test(shell),
    shell,
  );
}

done();
