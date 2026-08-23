// Verifies docs/qa/rule-guard-map.md does not lie (PRD Q2, T-119). It does NOT
// judge whether coverage is enough — that needs a human threshold. It checks
// the four things a machine can prove about the map:
//   1. every roles/<name>.md file has one `## roles/<name>.md` section, and
//      every such section names a real roles file — one per file, no more;
//   2. every row marked `bare` or `judgment` has a rule text that is an exact
//      substring of one line of the source its section names — a file, or any
//      `.md` file under a named directory — so the row is not invented (the
//      map's own format note promises this for those two statuses; `guarded`
//      rows may paraphrase, so they get no such check);
//   3. every row marked `guarded: <path>` resolves to a real file in the repo;
//   4. every section's `Rules mapped: N (guarded X · bare Y · judgment Z)`
//      line matches the rows actually parsed in that section.
// Plus three defence guards, because each is a way the map could lie and pass:
// a row whose rule cell contains a raw `|` (the cell split would hide part of
// the rule), a section source or guarded path that escapes the repository (a
// `..` could point at a file that happens to exist on the machine), and a
// duplicated `## roles/<name>.md` section (a Set of names would not notice a
// second section for one role).
// Run it with:  node tools/verify-rule-guard-map.mjs [map-file]
// The optional argument points at a copy of the map — the mutation proof runs
// the check against a corrupted copy without ever touching the real file.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

let failures = 0;
const fail = (message) => { failures += 1; console.error(`FAIL  ${message}`); };
const ok = (message) => console.log(`ok    ${message}`);

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const mapFile = process.argv[2] ?? "docs/qa/rule-guard-map.md";
const mapPath = resolve(packageRoot, mapFile);

// A `## ` or `### ` heading whose first token is a path opens a section. The
// path is a `.md` file (roles/*.md, principles.md) or a directory
// (`docs/tasks/`); the optional parenthetical (`### docs/tasks/ (DoD)`) is
// ignored. Any other heading is not a section — the same "ignore what is not
// the shape" rule verify-tasks.mjs uses for `## T-<number>`.
const SECTION = /^(#{2,3})\s+(\S+\.md|\S+\/)(?:\s+\(.*\))?\s*$/;
// The informational count line the map prints above every table.
const RULES_MAPPED = /^Rules mapped:\s*(\d+)\s*\(guarded\s+(\d+)\s*·\s*bare\s+(\d+)\s*·\s*judgment\s+(\d+)\)\s*$/;
// The exact status vocabulary: `guarded: <path>`, `bare`, `judgment`.
const GUARDED = /^guarded:\s*(\S+)\s*$/;

// Resolve `p` against the repo root and say whether it lands inside the repo.
// The `relative` check is what stops a `..` path escaping to a file that
// happens to exist on the machine; an absolute path outside the repo fails
// this by construction. The same shape verify-links.mjs uses for link targets.
function resolveInsideRepo(p) {
  const resolved = resolve(packageRoot, p);
  return { resolved, escapes: relative(packageRoot, resolved).startsWith("..") };
}

if (!existsSync(mapPath)) {
  fail(`${mapFile} is missing, so nothing records which rule has a guard (PRD Q2)`);
  console.log(`\n${failures} rule-guard-map check(s) failed`);
  process.exit(1);
}

// --- Parse: sections, their count lines, and their table rows. ---
const lines = readFileSync(mapPath, "utf8").split(/\r?\n/);
const sections = [];
let current = null;
for (const [index, line] of lines.entries()) {
  const heading = SECTION.exec(line);
  if (heading) {
    current = { source: heading[2], headingLine: index + 1, rows: [], countLine: null };
    sections.push(current);
    continue;
  }
  if (!current) continue;
  const count = RULES_MAPPED.exec(line);
  if (count) {
    current.countLine = count;
    continue;
  }
  if (!line.startsWith("|")) continue;
  const pieces = line.split("|");
  const cells = pieces.slice(1, 4).map((cell) => cell.trim());
  if (cells.length !== 3 || cells[2] === "status") continue; // the header row: its third cell is the word `status`
  if (cells.every((cell) => /^-+$/.test(cell))) continue;     // the | --- | --- | --- | separator
  // A well-formed 3-cell row is `| a | b | c |` — exactly five pieces after
  // splitting on `|`. More means a raw `|` inside a cell: the slice above
  // would silently truncate the rule text, and the truncated text is still
  // likely a substring of the source, so a lie would pass green. Refuse the
  // row instead of reading half of it.
  if (pieces.length > 5) {
    fail(`${mapFile} line ${index + 1} has ${pieces.length - 1} cells instead of 3 — a raw \`|\` inside a cell hides part of the rule text, so the row cannot be read`);
    continue;
  }
  current.rows.push({ rule: cells[0], owner: cells[1], status: cells[2], line: index + 1 });
}

// --- Check 1: one section per roles/*.md file, in both directions. ---
const rolesDir = join(packageRoot, "roles");
let roleFiles = [];
if (existsSync(rolesDir)) {
  roleFiles = readdirSync(rolesDir).filter((name) => name.endsWith(".md")).sort();
} else {
  fail(`roles/ is missing, so nothing can prove every role file is mapped (PRD Q2)`);
}
const roleSections = sections.filter((section) => /^roles\/.+\.md$/.test(section.source));
const mappedRoleKeys = new Set(roleSections.map((section) => section.source));
// A Set would not notice a second `## roles/<name>.md` section for one role,
// and every check below reads each section on its own — so a duplicate would
// pass with "one per file" still claimed. Count the sections themselves.
if (roleSections.length !== mappedRoleKeys.size) {
  fail(`${mapFile} has ${roleSections.length} role sections but only ${mappedRoleKeys.size} distinct role files — a \`## roles/<name>.md\` section is duplicated, so "one section per role" does not hold`);
}
for (const name of roleFiles) {
  const key = `roles/${name}`;
  if (mappedRoleKeys.has(key)) {
    ok(`${key} has a section in ${mapFile}`);
  } else {
    fail(`${key} has no \`## ${key}\` section in ${mapFile} — its rules are invisible (PRD Q2)`);
  }
}
for (const section of roleSections) {
  if (!roleFiles.includes(section.source.slice("roles/".length))) {
    fail(`${mapFile} section \`## ${section.source}\` (line ${section.headingLine}) names a file that is not in roles/ — a section for a role that does not exist`);
  }
}

// --- Checks 2, 3 and 4: per section. ---
let checkedRows = 0;
for (const section of sections) {
  const source = resolveInsideRepo(section.source);
  if (source.escapes) {
    fail(`${mapFile} section "${section.source}" (line ${section.headingLine}) escapes the repository — a section cannot name a source file outside the repo`);
    continue;
  }
  if (!existsSync(source.resolved)) {
    fail(`${mapFile} section "${section.source}" (line ${section.headingLine}) names a source file that does not exist: ${section.source}`);
    continue;
  }
  // The source of a section is a file, or a directory (the task table is
  // `docs/tasks/`): for a directory, every `.md` file under it is source, so a
  // bare/judgment anchor is provable from any of their lines.
  const sourceLines = statSync(source.resolved).isDirectory()
    ? readdirSync(source.resolved).filter((name) => name.endsWith(".md"))
      .flatMap((name) => readFileSync(join(source.resolved, name), "utf8").split(/\r?\n/))
    : readFileSync(source.resolved, "utf8").split(/\r?\n/);
  let guarded = 0;
  let bare = 0;
  let judgment = 0;
  for (const row of section.rows) {
    checkedRows += 1;
    if (row.rule === "" || row.owner === "") {
      fail(`${mapFile} section "${section.source}" (line ${row.line}) has an empty rule or owner cell — the table shape moved`);
      continue;
    }
    const guard = GUARDED.exec(row.status);
    if (guard) {
      guarded += 1;
      const guardPath = resolveInsideRepo(guard[1]);
      if (guardPath.escapes) {
        fail(`${mapFile} section "${section.source}" (line ${row.line}) claims \`guarded: ${guard[1]}\` — a path outside the repository, so it cannot be a guard of this repo`);
      } else if (!existsSync(guardPath.resolved)) {
        fail(`${mapFile} section "${section.source}" (line ${row.line}) claims \`guarded: ${guard[1]}\` but no such file exists`);
      }
    } else if (row.status === "bare" || row.status === "judgment") {
      if (row.status === "bare") bare += 1;
      else judgment += 1;
      if (!sourceLines.some((line) => line.includes(row.rule))) {
        fail(`${mapFile} section "${section.source}" (line ${row.line}) marks a rule \`${row.status}\` but its text is not an exact substring of any line of ${section.source}: "${row.rule}"`);
      }
    } else {
      fail(`${mapFile} section "${section.source}" (line ${row.line}) has an unknown status "${row.status}" — the vocabulary is \`guarded: <path>\`, \`bare\`, \`judgment\``);
    }
  }
  // Check 4: the count line must match the rows actually parsed.
  if (section.countLine === null) {
    fail(`${mapFile} section "${section.source}" (line ${section.headingLine}) has no \`Rules mapped: N (guarded X · bare Y · judgment Z)\` line`);
    continue;
  }
  const n = Number(section.countLine[1]);
  const g = Number(section.countLine[2]);
  const b = Number(section.countLine[3]);
  const j = Number(section.countLine[4]);
  if (g + b + j !== n) {
    fail(`${mapFile} section "${section.source}" count line says N=${n} but guarded ${g} + bare ${b} + judgment ${j} ≠ ${n}`);
  }
  if (guarded !== g || bare !== b || judgment !== j || section.rows.length !== n) {
    fail(`${mapFile} section "${section.source}" (line ${section.headingLine}) count line says ${n} rows (guarded ${g} · bare ${b} · judgment ${j}) but the table holds ${section.rows.length} rows (guarded ${guarded} · bare ${bare} · judgment ${judgment})`);
  } else {
    ok(`section ${section.source}: ${n} rows, count line matches (guarded ${g} · bare ${b} · judgment ${j})`);
  }
}

if (sections.length === 0) {
  fail(`${mapFile} has no section headings, so this check would pass without reading a single row — the file's shape moved (PRD Q2)`);
}

console.log(`\nRule-guard map: ${roleFiles.length} role files, ${sections.length} sections, ${checkedRows} rows checked.`);
console.log("This check proves the map is not lying — every role is mapped, every bare/judgment rule is really in its source, every guarded path is real, every count matches. It does NOT judge whether coverage is enough; that is a human decision (PRD Q2).");
console.log(failures === 0 ? "\nall rule-guard-map checks passed" : `\n${failures} rule-guard-map check(s) failed`);
process.exit(failures === 0 ? 0 : 1);
