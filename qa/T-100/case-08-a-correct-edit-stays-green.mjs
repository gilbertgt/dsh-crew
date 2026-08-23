// T-100 DoD item 9, the false-red half: a legitimate edit to publish.yml must
// leave the pin green.
//
// This is the half a mutation table never covers, and it is the one that decides
// whether the pin survives. A gate that reds a correct file teaches people to
// stop reading it — the lesson written into tools/verify-mount.mjs beside the
// continue-on-error pin (T-46), and the risk row in section eleven of
// docs/design/prd-2026-08-22-gh-release.md. Every edit below is something a
// person would reasonably do to this file next year, and every one of them must
// pass without a word.

import { check, done, tempRepo, runCheck, cleanUp, edit, expectGreen, saidOk } from "../lib/qa.mjs";
import { addToStep } from "./mutate.mjs";

const PUBLISH_YML = ".github/workflows/publish.yml";
const NOTES = "Read the release notes from CHANGELOG.md";
const RELEASE = "Create the GitHub release";
const OK = "the GitHub release steps are in place in";

const withEdit = (what, breakIt) => {
  const dir = tempRepo();
  try {
    expectGreen(runCheck(dir, "tools/verify-mount.mjs"), `${what}: the untouched copy is green`);
    breakIt(dir);
    const run = runCheck(dir, "tools/verify-mount.mjs");
    expectGreen(run, `${what}: still green`);
    check(`${what}: the pin still says the release steps are in place`, saidOk(run, OK), run.out);
  } finally {
    cleanUp(dir);
  }
};

// A comment added to a step. The most ordinary edit there is.
withEdit("a comment added inside the notes step", (dir) => {
  edit(dir, PUBLISH_YML, "        id: notes\n", "        id: notes\n        # why this step exists: see the PRD, section seven\n");
});

// The step name written as a quoted scalar. YAML reads all three quotings as the
// same string, and so must the pin.
withEdit("the release step's name quoted", (dir) => {
  edit(dir, PUBLISH_YML, `- name: ${RELEASE}`, `- name: "${RELEASE}"`);
});
withEdit("the notes step's name in single quotes", (dir) => {
  edit(dir, PUBLISH_YML, `- name: ${NOTES}`, `- name: '${NOTES}'`);
});

// A trailing comment on the name line.
withEdit("a trailing comment on the notes step's name", (dir) => {
  edit(dir, PUBLISH_YML, `- name: ${NOTES}\n`, `- name: ${NOTES} # the contract fixes this name\n`);
});

// An unrelated key added to the notes step. `shell: bash` is not an `if:` and
// must not be read as one.
withEdit("`shell: bash` added to the notes step", (dir) => addToStep(dir, PUBLISH_YML, NOTES, "        shell: bash"));

// A whole new step added at the end, after the release. Nothing in the contract
// says the release step must be last — only that it comes after the publish.
withEdit("a new step added after the release step", (dir) => {
  edit(
    dir,
    PUBLISH_YML,
    "            --notes-file release-notes.md\n",
    "            --notes-file release-notes.md\n\n      - name: Say what was released\n        if: steps.guard.outputs.publish == 'true'\n        run: echo \"released $GITHUB_REF_NAME\"\n",
  );
});

done();
