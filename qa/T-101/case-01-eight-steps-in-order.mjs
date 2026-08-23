// T-101 DoD item 1 (and M1's DoD item 1): the `publish` job runs exactly the
// eight steps section seven of docs/design/prd-2026-08-22-gh-release.md lists,
// in that order.
//
// Why this is a case and not left to the pin: tools/verify-mount.mjs compares
// the two NEW steps against the `npm publish` step and stops there. It has no
// opinion on the other six, on how many steps there are, or on a ninth step
// slipped in between. Those are what the PRD's table promises, so they are read
// here, straight off the delivered file.

import { check, done, repoFile } from "../lib/qa.mjs";
import { publishSteps } from "./steps.mjs";

const PUBLISH_YML = ".github/workflows/publish.yml";

// Position by position, exactly the PRD's table.
const EXPECTED = [
  { kind: "uses", label: "actions/checkout@v7" },
  { kind: "uses", label: "actions/setup-node@v7" },
  { kind: "name", label: "Decide whether to publish" },
  { kind: "name", label: "Read the release notes from CHANGELOG.md" },
  { kind: "name", label: "Run checks" },
  { kind: "name", label: "Ensure npm supports trusted publishing" },
  { kind: "name", label: "Publish" },
  { kind: "name", label: "Create the GitHub release" },
];

const steps = publishSteps(repoFile(PUBLISH_YML));

check(
  `${PUBLISH_YML}: the publish job has exactly ${EXPECTED.length} steps`,
  steps.length === EXPECTED.length,
  `found ${steps.length}: ${steps.map((step) => step.label).join(" | ")}`,
);

EXPECTED.forEach((want, position) => {
  const got = steps[position];
  check(
    `${PUBLISH_YML}: step ${position + 1} is ${want.kind} "${want.label}"`,
    Boolean(got) && got.kind === want.kind && got.label === want.label,
    got ? `found ${got.kind} "${got.label}" on line ${got.line + 1}` : "no step in that position",
  );
});

// The order is the point, so it is also asserted as an order and not only as
// eight independent positions: a file that renamed two steps into each other's
// places would satisfy the loop above only by satisfying this too, and a reader
// of a failure gets told the whole sequence at once.
check(
  `${PUBLISH_YML}: the eight labels read top to bottom in the PRD's order`,
  steps.map((step) => step.label).join(" >> ") === EXPECTED.map((want) => want.label).join(" >> "),
  steps.map((step) => step.label).join(" >> "),
);

done();
