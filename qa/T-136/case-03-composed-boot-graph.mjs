// T-136, DoD item 3 (positive): the isolated composed boot graph must carry a
// real dsh-crew entry, a batch containing it, and the package's existing
// ./client bundle. This case runs the regression over throwaway repository
// copies, so it checks composed values and paths rather than grepping source.
//
// The batch and graph-row mutations edit the verifier's in-memory composition
// code only inside a temporary copy. There is no separate batch file in this
// package; changing that composition is the smallest way to remove one graph
// value while leaving the real package tree intact.

import {
  check,
  cleanUp,
  done,
  edit,
  expectGreen,
  expectRed,
  failLines,
  runCheck,
  saidOk,
  tempRepo,
} from "../lib/qa.mjs";

const VERIFY = "tools/verify-client-boot-graph.mjs";
const GRAPH_OK = "the composed boot graph enrolls dsh-crew and its ./client bundle";
const GRAPH_FAIL = "the composed boot graph is missing the dsh-crew client enrollment";
const BATCH_ASSERT = "composed boot graph has a batch containing dsh-crew";
const ROW_BUNDLE_ASSERT = "dsh-crew graph entry points to the package ./client export";
const CLIENT_EXPORT_OK = 'package export "./client" remains ./client/crew-settings.js';
const CLIENT_PATH_OK = "the package ./client export resolves to the existing client bundle";

/** Print the real FAIL lines from a mutation, so a green QA run cannot hide its red proof. */
function showMutationFailure(label, run) {
  const lines = failLines(run);
  console.log(`note  ${label} failure output:`);
  for (const line of lines) console.log(`      ${line}`);
}

// Positive control: the untouched package must compose the graph and resolve
// the actual client file. expectGreen also rejects a verifier that crashed
// before reaching its checks.
const good = tempRepo();
try {
  const run = runCheck(good, VERIFY);
  expectGreen(run, "the untouched package copy is green");
  check(`the copy reports the composed entry, batch and bundle: ${GRAPH_OK}`, saidOk(run, GRAPH_OK), run.out);
  check(`the copy verifies the declared client export: ${CLIENT_EXPORT_OK}`, saidOk(run, CLIENT_EXPORT_OK), run.out);
  check(`the copy verifies the existing client file: ${CLIENT_PATH_OK}`, saidOk(run, CLIENT_PATH_OK), run.out);
} finally {
  cleanUp(good);
}

// Negative mutation 1: change only the core Loader row to its old subpath.
// The package and client file remain present, so a static package grep cannot
// explain the red; the composed graph must actually lose its dsh-crew entry.
const missingEntry = tempRepo();
try {
  edit(
    missingEntry,
    "cordis.patch.yml",
    "      name: 'dsh-crew'\n",
    "      name: 'dsh-crew/host/crew.js'\n",
  );
  const run = runCheck(missingEntry, VERIFY);
  showMutationFailure("missing dsh-crew graph entry", run);
  expectRed(run, GRAPH_FAIL, "the Loader subpath mutation is red for a missing graph entry");
} finally {
  cleanUp(missingEntry);
}

// Negative mutation 2: remove the batch from the composed graph while keeping
// the entry and its existing client path. The batch assertion must be the
// reason for the red, not the empty-entry branch.
const missingBatch = tempRepo();
try {
  edit(
    missingBatch,
    VERIFY,
    '    batches: entries.length === 0 ? [] : [{ id: "dsh-web-client", entries: entries.map((entry) => entry.id) }],\n',
    "    batches: [],\n",
  );
  const run = runCheck(missingBatch, VERIFY);
  showMutationFailure("missing dsh-crew batch", run);
  expectRed(run, BATCH_ASSERT, "removing the batch from composition is red");
} finally {
  cleanUp(missingBatch);
}

// Negative mutation 3: make the graph row advertise the Host export as its
// client bundle, while package.json still declares the correct ./client export
// and the real client file still exists. This specifically exercises the row
// to bundle equality assertion rather than only checking file existence.
const wrongBundle = tempRepo();
try {
  edit(wrongBundle, VERIFY, "      client: clientExport,\n", "      client: rootExport,\n");
  const run = runCheck(wrongBundle, VERIFY);
  showMutationFailure("wrong graph-row bundle", run);
  expectRed(run, ROW_BUNDLE_ASSERT, "pointing the graph row at the Host bundle is red");
} finally {
  cleanUp(wrongBundle);
}

done();