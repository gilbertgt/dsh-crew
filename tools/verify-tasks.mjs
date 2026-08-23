// Checks the Verdicts gate over every task file under docs/tasks/: one task per
// file, and each file's top heading `# T-<number> — …` is one task section that
// carries exactly one Verdicts line, where every `not run` or `skipped` value
// carries its own reason. README.md and any other file are not read.
// Run it with:  node tools/verify-tasks.mjs
//
// CRD 0011. The PM skipped code review on about twenty tasks of this job and
// doc review on most of it, and nothing went red — it came out only because the
// user asked. The rule the user chose (option B) guards honesty and visibility,
// not "the review must happen": a skip is allowed, a silent skip is not.
//
// The directory is fail-closed: a missing or empty docs/tasks/ goes red, never
// a quiet green. A green with nothing read reads exactly like a green with
// everything read, so if the directory's shape moved, say so instead (CRD 0011).
//
// What this proves, and what it cannot: the Verdicts line is written by the PM,
// and reviewers cannot write files by design (principles.md 12). So this check
// proves the line was written and every skip carries a sentence. It does not
// prove a review happened — a PM that types `code: pass` passes. No automated
// check can close that hole.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

let failures = 0;
const fail = (message) => { failures += 1; console.error(`FAIL  ${message}`); };
const ok = (message) => console.log(`ok    ${message}`);

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TASKS_DIR = "docs/tasks";
const tasksDir = join(packageRoot, TASKS_DIR);

// A task file's own top heading: `# T-<number> — …`. The id is the load-bearing
// part — the file name and the heading must agree; the dash after the id is not
// required.
const FILE_HEADING = /^#\s+(T-[A-Za-z0-9-]+)/;
// The line, not a table column: `- **Verdicts**：code: … ｜ security: … ｜ …`.
const VERDICTS = /^\s*-\s*\*\*Verdicts\*\*[：:]\s*(.*)$/;

// One file per task. A file named `T-<n>.md` whose first level-1 heading
// declares the same id is one task section. `README.md` and any other file are
// not read: the `T-*.md` name filter and the heading-id check together are what
// keep them out.
function parseTasksDir() {
  const sections = [];
  if (!existsSync(tasksDir)) {
    fail(`${TASKS_DIR}/ is missing, so nothing records whether a task's four reviews ran (CRD 0011)`);
    return sections;
  }
  const files = readdirSync(tasksDir).filter((name) => /^T-[A-Za-z0-9-]+\.md$/.test(name)).sort();
  // A green with nothing found is the worst outcome: it reads exactly like a
  // green with everything found. If the directory's shape moved, say so instead.
  if (files.length === 0) {
    fail(`${TASKS_DIR}/ contains no \`T-<number>.md\` task file, so this check would pass without reading a single Verdicts line from that source — the directory's shape moved (CRD 0011)`);
    return sections;
  }
  for (const file of files) {
    const id = file.replace(/\.md$/, "");
    const label = `${TASKS_DIR}/${file}`;
    const lines = readFileSync(join(tasksDir, file), "utf8").split("\n");

    // A file named T-121.md whose top heading says T-122 — or nothing — means
    // the file is not a task section the way this gate can read it. Skipping it
    // silently would be a one-file vacuous green.
    const headingIndex = lines.findIndex((line) => /^#\s/.test(line));
    const heading = headingIndex === -1 ? null : FILE_HEADING.exec(lines[headingIndex]);
    if (!heading || heading[1].toLowerCase() !== id.toLowerCase()) {
      fail(`${label} has no \`# ${id} — …\` top heading, so it is not a task section — the file's shape moved (CRD 0011)`);
      continue;
    }

    const section = { source: label, id, line: headingIndex + 1, verdicts: [] };
    let fenced = false;
    for (const [index, line] of lines.entries()) {
      // A fenced markdown example of the Verdicts line would otherwise be read
      // as this file's real record.
      if (line.startsWith("```")) {
        fenced = !fenced;
        continue;
      }
      if (fenced) continue;
      const verdicts = VERDICTS.exec(line);
      if (verdicts) section.verdicts.push({ line: index + 1, content: verdicts[1] });
    }
    sections.push(section);
  }
  return sections;
}

const sections = parseTasksDir();

// Fail-closed per source: a directory with no sections read is a red, with the
// specific failure already counted above in parseTasksDir.
if (sections.length > 0) {
  ok(`${TASKS_DIR}/: ${sections.length} task sections read`);
}

// Fail condition 1 of CRD 0011: exactly one Verdicts line per task section. None, and
// nothing records whether the four reviews ran; two, and a reader cannot tell
// which one counts.
for (const section of sections) {
  if (section.verdicts.length === 0) {
    fail(`${section.source} section "${section.id}" (line ${section.line}) has no \`- **Verdicts**：\` line, so nothing records whether its four reviews ran (CRD 0011)`);
  } else if (section.verdicts.length > 1) {
    fail(`${section.source} section "${section.id}" (line ${section.line}) has ${section.verdicts.length} Verdicts lines, so no reader can tell which one counts. Keep exactly one (CRD 0011)`);
  }
}

// The four values, in the shape the file uses: `code: … ｜ security: … ｜ qa: …
// ｜ doc: …`. Anything on the line that is not one of the four keys — a trailing
// parenthetical, for one — is not a value and is not read as one.
const KEYS = ["code", "security", "qa", "doc"];
const VALUE = /^\s*(code|security|qa|doc)\s*[：:]\s*([\s\S]*)$/i;

/** The four values of one Verdicts line, by key. A key can be missing. */
function valuesOf(content) {
  const found = new Map();
  for (const segment of content.split(/[｜|]/)) {
    const value = VALUE.exec(segment);
    if (value) found.set(value[1].toLowerCase(), value[2].trim());
  }
  return found;
}

// Fail condition 2 of CRD 0011: all four values, or the line says nothing about
// the review it left out.
let notRun = 0;
let skipped = 0;
for (const section of sections) {
  if (section.verdicts.length !== 1) continue; // already failed above
  const { line, content } = section.verdicts[0];
  const values = valuesOf(content);
  const missing = KEYS.filter((key) => !values.has(key));
  if (missing.length > 0) {
    fail(`${section.source} section "${section.id}" (line ${line}) Verdicts line has no \`${missing.join("`, `")}\` value, so it says nothing about that review. All four are required: ${KEYS.join(", ")} (CRD 0011)`);
  }

  for (const [key, value] of values) {
    // T-40's DoD, item 5 (the CRD's own list stops at three): `changes needed`
    // is only half a record until it says which task fixes it. Without a task
    // id the finding has no owner.
    if (/^changes needed\b/i.test(value) && !/T-\d+/.test(value)) {
      fail(`${section.source} section "${section.id}" (line ${line}) \`${key}: changes needed\` names no task id, so the fix has no owner. Say which T-<number> carries it (CRD 0011)`);
    }

    const skip = /^(not run|skipped)\b([\s\S]*)$/i.exec(value);
    if (!skip) continue;
    if (/^not run\b/i.test(value)) notRun += 1;
    else skipped += 1;

    // Fail condition 3 of CRD 0011: `not run — <why>` or `skipped — <why>`, and the dash
    // must be followed by real text. A general parenthetical at the end of the
    // line does not count: it cannot say which of the four values it covers,
    // and the record of this job was exactly that shape — a parenthetical about
    // code review and doc review, on a line whose `security: not run` and
    // `qa: not run` it never mentioned.
    const word = skip[1].toLowerCase();
    if (/^\s*[—–-]+\s*$/.test(skip[2])) {
      fail(`${section.source} section "${section.id}" (line ${line}) \`${key}: ${word}\` has a dash with nothing after it. Write the reason: a skip is allowed, a silent skip is not (CRD 0011)`);
    } else if (!/^\s*[—–-]+\s*\S/.test(skip[2])) {
      fail(`${section.source} section "${section.id}" (line ${line}) \`${key}: ${word}\` carries no reason of its own. Write \`${word} — <why>\`: a skip is allowed, a silent skip is not (CRD 0011)`);
    }
  }
}

if (failures === 0) {
  ok("every task section carries one Verdicts line, all four values, a reason for every `not run` and `skipped`, and a task id for every `changes needed`");
}

console.log(`\nVerdicts totals across ${sections.length} task sections: ${notRun} not run, ${skipped} skipped.`);
console.log("Passing is not the same as clean. This check proves the line was written and every skip carries a reason; it cannot prove a review happened — a `code: pass` typed by the PM passes it (CRD 0011).");
console.log(failures === 0 ? "\nall Verdicts checks passed" : `\n${failures} Verdicts check(s) failed`);
process.exit(failures === 0 ? 0 : 1);
