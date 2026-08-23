// T-101 DoD item 10: the release command is the three-part `gh release create`
// the PRD wrote down, and none of the three forbidden flags is on it.
//
// `--generate-notes` is the one that matters, and it is not a style rule.
// It makes GitHub write a summary out of commits and pull requests — which is
// exactly the text this whole change exists to replace. A run carrying it would
// be green, would create a release, and would publish the wrong words: the
// failure mode nobody would notice, because there IS a release page.
//
// `--draft` would hide the page from everyone, and `--prerelease` would mark
// `0.x` as a preview while npm's `latest` tag says otherwise. Both were ruled
// out in section four of docs/design/prd-2026-08-22-gh-release.md.
//
// tools/verify-mount.mjs reads not one character of this command. Its own
// comment says so. So this is the only thing in the repository reading it.

import { check, done, repoFile, flat } from "../lib/qa.mjs";
import { publishSteps, stepNamed, shellOf, codeOnly } from "./steps.mjs";

const PUBLISH_YML = ".github/workflows/publish.yml";
const RELEASE_STEP_NAME = "Create the GitHub release";
const FORBIDDEN = ["--draft", "--prerelease", "--generate-notes"];

const text = repoFile(PUBLISH_YML);
const steps = publishSteps(text);
const release = stepNamed(steps, RELEASE_STEP_NAME);

check(`${PUBLISH_YML}: there is a step named "${RELEASE_STEP_NAME}"`, Boolean(release), steps.map((step) => step.label).join(" | "));

if (release) {
  // Comments come off first. This file explains in prose why `--generate-notes`
  // is not used, and a whole-file `includes` would read that explanation as the
  // flag itself — a case that could only ever be red.
  const command = flat(codeOnly(shellOf(release)).replace(/\\\n/g, " "));

  check(
    `${PUBLISH_YML}: the release step runs \`gh release create\` on the tag it was started by`,
    /gh release create "\$GITHUB_REF_NAME"/.test(command),
    command,
  );
  check(
    `${PUBLISH_YML}: it titles the release with the tag name`,
    /--title "\$GITHUB_REF_NAME"/.test(command),
    command,
  );
  check(
    `${PUBLISH_YML}: its notes come from the file the previous step wrote, \`release-notes.md\``,
    /--notes-file release-notes\.md/.test(command),
    command,
  );

  for (const flag of FORBIDDEN) {
    check(
      `${PUBLISH_YML}: the release command carries no \`${flag}\``,
      !command.includes(flag),
      command,
    );
  }
}

// And nowhere else in the file either — a forbidden flag added to a different
// step, or to a second `gh release` call, would be just as wrong. Read off the
// file with its comments removed, for the same reason as above.
const wholeFile = codeOnly(text);
for (const flag of FORBIDDEN) {
  check(
    `${PUBLISH_YML}: no command anywhere in the file carries \`${flag}\``,
    !wholeFile.includes(flag),
    wholeFile.split("\n").filter((line) => line.includes(flag)).join("\n"),
  );
}

done();
