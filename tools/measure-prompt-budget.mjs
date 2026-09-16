// Crew V2 — the prompt budget, measured the same way every time.
//
// The reason V2 exists is that every turn of a crew job used to carry the whole
// PM prompt: 145 KB of flow, ceremony, decision rules and long rule lists, in
// front of the model on every single step, whether that step was an interview, a
// task run or a push. V2 leaves the invariants in `roles/pm.md` and moves the rest
// into playbooks the PM reads with `read` when the job needs one.
//
// This tool answers one question with numbers: how much text does the PM carry on
// EVERY turn now, against the baseline, and how much moved out? It is deliberately
// static and deterministic — the same two revisions give the same table on any
// machine — because a wall-clock or token A/B needs a live session and cannot be
// reproduced from a checkout. Those numbers are NOT claimed here; `qa/gaps.md`
// says so out loud.
//
// Run it with:  node tools/measure-prompt-budget.mjs [baseline-rev]
// The default baseline is `16be372`, the commit V2 branched from.

import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { PLAYBOOKS, readPmCore, readPlaybook } from "../host/playbooks.js";

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BASELINE = process.argv[2] ?? "16be372";

/** Bytes, because that is what a prompt costs; characters understate UTF-8 prose. */
const bytes = (text) => Buffer.byteLength(text, "utf8");
/**
 * A rough token count, and it is labelled as one wherever it is printed.
 *
 * Four bytes per token is the usual English-prose rule of thumb. It is not a
 * tokenizer and this repository does not ship one: the number is here to show the
 * size of the change, not to predict a bill.
 */
const estTokens = (text) => Math.round(bytes(text) / 4);
const lines = (text) => text.split("\n").length;

/** The baseline `roles/pm.md`, or undefined when that revision is not in this clone. */
function baselineCore(rev) {
  try {
    return execFileSync("git", ["show", `${rev}:roles/pm.md`], {
      cwd: PACKAGE_ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return undefined;
  }
}

const core = readPmCore();
const v1 = baselineCore(BASELINE);
const playbooks = PLAYBOOKS.map((playbook) => ({ file: playbook.file, text: readPlaybook(playbook.file) }));
// The folder's real cost, one file at a time. Joining them first would count the
// blank lines between them and print a number no file on disk has — small, but it
// is exactly the kind of quiet disagreement between a table and its files that
// makes a measurement worthless.
const playbookBytes = playbooks.reduce((sum, playbook) => sum + bytes(playbook.text), 0);

const rowOf = (label, byteCount, lineCount, tokens) =>
  `${label.padEnd(42)}${String(byteCount).padStart(9)}${String(lineCount).padStart(9)}${String(tokens).padStart(10)}`;
const row = (label, text) => rowOf(label, bytes(text), lines(text), estTokens(text));

console.log(`Crew V2 prompt budget — baseline ${BASELINE}`);
console.log(`${"".padEnd(42)}${"bytes".padStart(9)}${"lines".padStart(9)}${"~tokens".padStart(10)}`);
if (v1 === undefined) {
  console.log(`V1 roles/pm.md${" ".repeat(30)}   (not in this clone — the baseline half is skipped)`);
} else {
  console.log(row("V1 roles/pm.md (every turn)", v1));
}
console.log(row("V2 roles/pm.md (every turn)", core));
console.log(rowOf(
  "V2 playbooks (read on demand)",
  playbookBytes,
  playbooks.reduce((sum, playbook) => sum + lines(playbook.text), 0),
  playbooks.reduce((sum, playbook) => sum + estTokens(playbook.text), 0),
));
for (const playbook of playbooks) console.log(row(`  ${playbook.file}`, playbook.text));

if (v1 !== undefined) {
  const delta = bytes(core) - bytes(v1);
  const percent = ((delta / bytes(v1)) * 100).toFixed(1);
  console.log(
    `\ncarried on every turn: ${delta} bytes (${percent}%), about ${estTokens(core) - estTokens(v1)} estimated tokens.`,
  );
}
console.log(
  `moved out of the prompt and into playbooks: ${playbookBytes} bytes across ${playbooks.length} file(s).`,
);
console.log(
  "\nWhat this table is NOT: a wall-clock, tool-call or token-usage A/B of two live jobs.",
);
console.log(
  "Those need a real session and are not reproducible from a checkout, so no number for them is claimed here (qa/gaps.md).",
);
