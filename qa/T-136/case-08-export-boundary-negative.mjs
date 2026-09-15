// T-136 DoD items 1/3 (boundary regression): removing or retargeting the package root export must turn the isolated boot-graph check red.

import {
  check,
  done,
  editJson,
  expectGreen,
  expectRed,
  failLines,
  cleanUp,
  runCheck,
  saidOk,
  tempRepo,
} from "../lib/qa.mjs";

const SCRIPT = "tools/verify-client-boot-graph.mjs";
const ROOT_EXPORT_OK = 'package root export "." resolves to ./host/crew.js';
const HOST_RESOLUTION = "the package root export resolves to the existing Host plugin";
const GRAPH_ENROLLMENT = "the composed boot graph is missing the dsh-crew client enrollment";
const GRAPH_OK = "the composed boot graph enrolls dsh-crew and its ./client bundle";

function printObservedFailure(label, run) {
  console.log(`observed ${label}: exit ${run.status}`);
  for (const line of failLines(run)) console.log(`      ${line}`);
}

function withMutation(label, mutate, assertFailure) {
  const dir = tempRepo();
  try {
    const baseline = runCheck(dir, SCRIPT);
    expectGreen(baseline, `${label}: the untouched temporary copy is green`);
    mutate(dir);
    const broken = runCheck(dir, SCRIPT);
    printObservedFailure(label, broken);
    assertFailure(broken);
  } finally {
    cleanUp(dir);
  }
}

// Positive control: the real package boundary and composed enrollment both pass
// before either negative mutation is applied.
const baselineDir = tempRepo();
try {
  const baseline = runCheck(baselineDir, SCRIPT);
  expectGreen(baseline, "the untouched temporary copy passes the client boot-graph regression");
  check("the baseline verifies the package root export", saidOk(baseline, ROOT_EXPORT_OK), baseline.out);
  check("the baseline verifies composed dsh-crew enrollment", saidOk(baseline, GRAPH_OK), baseline.out);
} finally {
  cleanUp(baselineDir);
}

// Boundary mutation 1: deleting exports["."] must not be hidden by the client
// bundle's independent checks; both the root-export pin and composition must fail.
withMutation(
  "removing package exports[\".\"]",
  (dir) => editJson(dir, "package.json", (manifest) => {
    if (manifest.exports === undefined || !Object.prototype.hasOwnProperty.call(manifest.exports, ".")) {
      throw new Error('package.json has no exports["."] entry to remove');
    }
    delete manifest.exports["."];
  }),
  (broken) => {
    expectRed(broken, ROOT_EXPORT_OK, "removing exports[\".\"] reports the root-export failure");
    expectRed(broken, GRAPH_ENROLLMENT, "removing exports[\".\"] reports the composed-enrollment failure");
    check(
      "removing exports[\".\"] does not claim the composed graph is enrolled",
      !saidOk(broken, GRAPH_OK),
      broken.out,
    );
  },
);

// Boundary mutation 2: pointing exports["."] at a missing Host target must
// produce a real non-zero result and identify the root-export resolution failure.
withMutation(
  "retargeting package exports[\".\"]",
  (dir) => editJson(dir, "package.json", (manifest) => {
    if (manifest.exports === undefined || manifest.exports["."] !== "./host/crew.js") {
      throw new Error('package.json exports["."] does not have the expected baseline target');
    }
    manifest.exports["."] = "./host/not-a-host-plugin.js";
  }),
  (broken) => {
    expectRed(broken, ROOT_EXPORT_OK, "retargeting exports[\".\"] reports the root-export target failure");
    expectRed(broken, HOST_RESOLUTION, "retargeting exports[\".\"] reports the missing Host target");
    check(
      "retargeting exports[\".\"] does not claim the Host plugin resolves",
      !saidOk(broken, HOST_RESOLUTION),
      broken.out,
    );
  },
);

done();
