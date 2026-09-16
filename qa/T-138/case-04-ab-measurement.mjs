// T-138 (Crew V2) — the A/B measurement, and what it is not.
//
// V2 claims one measurable thing: the text the PM carries on EVERY turn is much
// smaller than it was, and the rest moved into playbooks read on demand. A claim
// like that is worth nothing unless somebody can reproduce the number, so
// `tools/measure-prompt-budget.mjs` prints it from two revisions in this
// repository and nothing else.
//
// What this case proves:
//   1. the tool runs green, here, in this checkout;
//   2. the numbers it prints are the real sizes of the real files — a table that
//      disagrees with `roles/pm.md` is a table nobody should quote;
//   3. running it twice prints exactly the same bytes: the measurement is
//      deterministic, not a snapshot of a machine;
//   4. the per-turn figure it computes from those sizes is smaller than the
//      baseline's, whatever the exact percentage is;
//   5. it says out loud what it does NOT measure — a live job's wall clock, tool
//      calls and token usage — so the number cannot be quoted as that.
//
// WHAT THIS CASE DELIBERATELY DOES NOT DO. It does not assert a target such as
// "at least 80% smaller", and it does not turn a nice percentage into evidence.
// The measurement exists to stop a claim being made from memory; the target was
// never the point, and a case that pinned one would go green on a prompt that hit
// the number for the wrong reasons.

import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { check, done, REPO, tempDir, cleanUp } from "../lib/qa.mjs";
import { PLAYBOOKS, PM_CORE_MAX_BYTES } from "../../host/playbooks.js";

const TOOL = "tools/measure-prompt-budget.mjs";

/** Run the measurement tool against this checkout, with a throwaway home. */
function measure() {
  const home = tempDir("crew-qa-measure-");
  try {
    const result = spawnSync(process.execPath, [TOOL], {
      cwd: REPO,
      encoding: "utf8",
      env: { ...process.env, DSH_HOME: home, HOME: home },
    });
    return { status: result.status, out: `${result.stdout ?? ""}${result.stderr ?? ""}` };
  } finally {
    cleanUp(home);
  }
}

const first = measure();
check(`${TOOL} runs green`, first.status === 0, `exit ${first.status}\n${first.out.slice(-800)}`);

const second = measure();
check(
  "the measurement is deterministic: two runs print the same bytes",
  first.out === second.out,
  "the tool prints something that changes between runs — a timestamp, a path, a duration. A number that "
    + "moves on its own cannot be compared with anything.",
);

// ---------------------------------------------- the numbers are the real files

const coreBytes = Buffer.byteLength(readFileSync(join(REPO, "roles", "pm.md"), "utf8"), "utf8");
// Trimmed, because that is the text the tool measures and the text a reader
// really gets: `readPlaybook()` trims, so a trailing newline in a file is not
// prompt. Every playbook figure below is the trimmed size.
const trimmedBytes = (name) => Buffer.byteLength(readFileSync(join(REPO, "roles", "playbooks", name), "utf8").trim(), "utf8");
const playbookBytes = PLAYBOOKS.reduce((sum, playbook) => sum + trimmedBytes(playbook.file), 0);
const onDiskBytes = readdirSync(join(REPO, "roles", "playbooks"))
  .filter((name) => name.endsWith(".md"))
  .reduce((sum, name) => sum + trimmedBytes(name), 0);

/** Pull the byte figure the tool printed for one labelled row. */
function printedBytes(label) {
  const line = first.out.split("\n").find((row) => row.startsWith(label));
  if (line === undefined) return undefined;
  const match = /\s(\d+)\s+\d+\s+\d+\s*$/.exec(line);
  return match === null ? undefined : Number(match[1]);
}

check(
  "the table's V2 core figure is the real size of roles/pm.md",
  printedBytes("V2 roles/pm.md (every turn)") === coreBytes,
  `the tool printed ${printedBytes("V2 roles/pm.md (every turn)")} bytes while roles/pm.md is ${coreBytes}: the `
    + `table disagrees with the file, so every number under it is untrustworthy`,
);
check(
  "the table's playbook figure is the real size of roles/playbooks/",
  printedBytes("V2 playbooks (read on demand)") === playbookBytes && playbookBytes === onDiskBytes,
  `printed ${printedBytes("V2 playbooks (read on demand)")}, manifest sum ${playbookBytes}, folder sum ${onDiskBytes}`,
);

const v1 = printedBytes("V1 roles/pm.md (every turn)");
if (v1 === undefined) {
  console.log(
    "      the baseline revision is not in this clone (a shallow checkout, or the commit is gone), so the "
      + "A/B half is skipped. The V2 half above is still measured against the real files.",
  );
} else {
  check(
    "the baseline row is the baseline size, not the current one",
    v1 > coreBytes,
    `the V1 row prints ${v1} bytes and the V2 row ${coreBytes} — if they are equal, the tool is measuring `
      + `the same revision twice and the comparison means nothing`,
  );
  check(
    "the per-turn figure really went down",
    first.out.includes("carried on every turn:") && first.out.includes("-"),
    `the tool did not print a per-turn delta, so nothing about the change is measured`,
  );
  const percent = /carried on every turn: -?\d+ bytes \((-?\d+\.\d+)%\)/.exec(first.out);
  check(
    "the per-turn figure is printed as a percentage of the baseline",
    percent !== null && Number(percent[1]) < 0,
    `expected a negative percentage against the baseline, got ${JSON.stringify(percent?.[1])}`,
  );
  console.log(`      V1 ${v1} bytes on every turn, V2 ${coreBytes} bytes, core budget ${PM_CORE_MAX_BYTES}.`);
}

// ------------------------------------------- what the tool says it does not do

check(
  "the tool says out loud that it is not a live-job A/B",
  /wall-clock/i.test(first.out) && /NOT/i.test(first.out),
  "a static prompt measurement is easy to misquote as a token or wall-clock saving. The tool has to say "
    + "which one it is, in its own output, or the next person quotes the wrong number.",
);

done();
