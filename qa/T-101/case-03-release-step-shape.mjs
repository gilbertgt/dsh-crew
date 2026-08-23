// T-101 DoD item 1, the step-8 half (M1 DoD item 1): the step that creates the
// GitHub release is named exactly what the contract fixed, and is gated on the
// same guard the publish is gated on.
//
// The gate is the interview's answer 3, written into the file: re-pushing a tag
// whose version is already on npm sets `publish=false` and skips the publish, so
// an ungated release step would then run alone and announce a release for a run
// that published nothing.

import { check, done, repoFile } from "../lib/qa.mjs";
import { publishSteps, stepNamed, keyRaw } from "./steps.mjs";

const PUBLISH_YML = ".github/workflows/publish.yml";
const RELEASE_STEP_NAME = "Create the GitHub release";

const steps = publishSteps(repoFile(PUBLISH_YML));
const release = stepNamed(steps, RELEASE_STEP_NAME);

check(
  `${PUBLISH_YML}: there is a step named exactly "${RELEASE_STEP_NAME}"`,
  Boolean(release),
  `step names found: ${steps.map((step) => step.label).join(" | ")}`,
);

if (release) {
  const condition = keyRaw(release, "if");
  check(`${PUBLISH_YML}: that step has an \`if:\``, condition !== null, "no `if:` on it");
  check(
    `${PUBLISH_YML}: its \`if:\` names \`steps.guard.outputs.publish\``,
    Boolean(condition) && condition.includes("steps.guard.outputs.publish"),
    `if: ${condition}`,
  );
  check(
    `${PUBLISH_YML}: its \`if:\` compares against 'true'`,
    Boolean(condition) && condition.includes("'true'"),
    `if: ${condition}`,
  );
  // The gate has to be the SAME one the publish carries. Two different gates
  // would be two chances to disagree, and the release page is the half nobody
  // notices is missing.
  const publish = stepNamed(steps, "Publish");
  check(
    `${PUBLISH_YML}: it is the same condition the \`Publish\` step carries`,
    Boolean(publish) && keyRaw(publish, "if") === condition,
    `release: ${condition} / publish: ${publish ? keyRaw(publish, "if") : "no Publish step"}`,
  );
  // `gh` needs a token and the runner already has one. No secret is configured
  // for this repository, so a different token name would be an empty variable.
  check(
    `${PUBLISH_YML}: it passes \`GH_TOKEN: \${{ secrets.GITHUB_TOKEN }}\``,
    /^[ \t]*GH_TOKEN:[ \t]*\$\{\{[ \t]*secrets\.GITHUB_TOKEN[ \t]*\}\}[ \t]*$/m.test(release.code),
    release.code,
  );
}

done();
