// T-136 DoD item 1 — proves package root "." export resolves to "./host/crew.js"
// and "./client" remains "./client/crew-settings.js"; malformed exports make the
// real isolated boot-graph verifier fail in a temporary copy.

import {
  check,
  cleanUp,
  done,
  editJson,
  expectGreen,
  expectRed,
  runCheck,
  saidOk,
  tempRepo,
} from "../lib/qa.mjs";

const VERIFY = "tools/verify-client-boot-graph.mjs";
const ROOT_TARGET = 'package root export "." resolves to ./host/crew.js';
const CLIENT_TARGET = 'package export "./client" remains ./client/crew-settings.js';
const ROOT_EXISTS = "the package root export resolves to the existing Host plugin";
const CLIENT_EXISTS = "the package ./client export resolves to the existing client bundle";

// First run the real verifier over an untouched repository-shaped copy. These
// output lines are the result of the export checks, not a source-text assertion.
const baseline = tempRepo();
try {
  const run = runCheck(baseline, VERIFY);
  expectGreen(run, "the untouched package copy passes the isolated boot-graph verifier");
  for (const message of [ROOT_TARGET, CLIENT_TARGET, ROOT_EXISTS, CLIENT_EXISTS]) {
    check(`the verifier reports: ${message}`, saidOk(run, message), run.out);
  }
} finally {
  cleanUp(baseline);
}

function expectExportMutationRed(description, mutate, failureNeedle) {
  const copy = tempRepo();
  try {
    mutate(copy);
    const run = runCheck(copy, VERIFY);
    expectRed(run, failureNeedle, description);
  } finally {
    cleanUp(copy);
  }
}

// Removing the package root export must be observable as a named verification
// failure, rather than merely producing an unexplained non-zero exit.
expectExportMutationRed(
  "removing exports[\".\"] makes the root-export check red",
  (dir) => editJson(dir, "package.json", (manifest) => { delete manifest.exports["."]; }),
  ROOT_TARGET,
);

// An existing but wrong root target must also fail: checking only that some file
// exists would otherwise let a different Host module masquerade as the root.
expectExportMutationRed(
  "pointing exports[\".\"] at the wrong Host file makes the root-export check red",
  (dir) => editJson(dir, "package.json", (manifest) => { manifest.exports["."] = "./host/roles.js"; }),
  ROOT_TARGET,
);

// The client subpath is part of this DoD too; a wrong target must not be hidden
// by the package root still being correct.
expectExportMutationRed(
  "pointing exports[\"./client\"] at a wrong file makes the client-export check red",
  (dir) => editJson(dir, "package.json", (manifest) => { manifest.exports["./client"] = "./client/not-crew-settings.js"; }),
  CLIENT_TARGET,
);

done();
