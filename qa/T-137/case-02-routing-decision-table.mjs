// T-137 DoD item 2 — the routing decision table in step 1 of `roles/pm.md` is a
// real table, and it routes the seven cases this task fixed.
//
// Why a table and not more prose: the rule the user gave is a MAP — a kind of work
// to a number of roles — and prose is where a map rots. Reading it as a table
// means a row can be checked, changed and argued about one at a time, and it means
// these cases can be run against the shipped prompt instead of against a summary
// of it. So the case PARSES the markdown table (header plus cells), looks up each
// expected row by what it is about, and reads the two columns that decide:
//
//   Route            `direct`, `solo` or `crew`, and nothing else;
//   Security review  answered separately from the route.
//
// The lookup is by subject phrase, not by row number, so a row may be reworded or
// moved as long as it keeps saying the same thing about the same kind of work.
// Three structural checks come with it, and they are the part that keeps the table
// honest rather than merely present: the route column never names user input, two
// rows share one route while differing in security review (which is what proves
// the two columns are two decisions), and no cell is left empty.
//
// The mutation at the end raises an ordinary settings UI to `crew` in a copy and
// demands the table audit go red on that row: without it, this case would still
// pass on a table whose `Route` column had been rewritten to `crew` everywhere.
//
// The routing table has a SECOND copy, in the `crew-routing` playbook the PM opens
// when the short rules are not enough. That copy is read here too and compared cell
// by cell with this one: it is the file a PM actually reads while placing a hard
// job, and it used to answer the security column in words of its own — "the core's
// own security list decides", pointing at a core section that holds no such list —
// while nothing read it. Both tables are cut down to their own table block first,
// because this rule file's body is followed by the playbooks, and a scan that ran
// on past the table's last row would be judging the playbook copies as if they were
// this table.
//
// Reads `roles/pm.md` and `roles/playbooks/crew-routing.md`; writes only inside one
// throwaway copy, which it removes.

import { check, cleanUp, copyFile, done, edit, repoFile, section, step, tempRepo, pm } from "../lib/qa.mjs";

const HEADING = "Pick a lane and route";
const ROUTES = ["direct", "solo", "crew"];
const HEADER = ["the work", "route", "security review", "when it becomes `crew`"];

/** Every expected row: what the work is, and the two answers the table owes it. */
const EXPECTED = [
  { id: "README 拼字 → direct", needle: "spelling fix in `readme.md`", route: "direct", security: "no" },
  { id: "單檔純函式 bug → direct", needle: "bug inside one pure function", route: "direct", security: "no" },
  { id: "3 個一般 product files → solo", needle: "three ordinary product files", route: "solo", security: "no" },
  { id: "普通設定 UI → solo", needle: "ordinary settings ui", route: "solo", security: "no" },
  { id: "UI + auth/permission → solo + security review", needle: "login or a permission check", route: "solo", security: "yes" },
  { id: "跨核心模組 contract 變更 → crew", needle: "contract change between two core modules", route: "crew", security: "closed-list" },
  { id: "migration + auth + network → crew", needle: "migration plus a login change plus the network", route: "crew", security: "yes" },
];

const clean = (cell) => cell.replace(/[`*]/g, "").trim();
const routeOf = (cell) => clean(cell).toLowerCase();
const lower = (text) => text.toLowerCase();

/**
 * Every data row of every four-column markdown table in `text`.
 * @returns an array of { line, cells } — header and separator rows are dropped
 */
function tableRows(text) {
  const rows = [];
  for (const [index, line] of text.split("\n").entries()) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) continue;
    const cells = trimmed.slice(1, -1).split("|").map((cell) => cell.trim());
    if (cells.length !== 4) continue; // not one of this file's four-column tables
    if (cells.every((cell) => /^:?-{2,}:?$/.test(cell))) continue; // the separator
    if (lower(cells[0]) === HEADER[0]) continue; // the header
    rows.push({ line: index + 1, cells });
  }
  return rows;
}

/** How the security column answers, in the shapes this table uses. */
function securityKind(cell) {
  const text = clean(cell).toLowerCase();
  if (text === "no") return "no";
  if (text.startsWith("yes")) return "yes";
  // V2: the crew row pointed at "step 10b's own list", which sent a `direct` or
  // `solo` job into the crew flow for a step number. The list is named instead.
  if (text.startsWith("the closed risky list")) return "closed-list";
  return "other";
}

const ID = {
  section: `roles/pm.md still has a "## ${HEADING}" section`,
  header: "the table has this file's four columns, named",
  rows: `the table carries exactly ${EXPECTED.length} rows, so a row that moves away is noticed`,
  empty: "no cell of any row is left empty",
  vocabulary: "every route cell is `direct`, `solo` or `crew`, and nothing else",
  security: "every security cell answers no, yes, or that the closed risky list decides",
  noInput: "the Route column never names user input",
  independence: "two rows share one route and differ in the security review",
  soloNotCrew: "an ordinary settings UI is not routed to the whole crew",
  noStrayNumbers: "the routing rules add no top-level numbered item to step 1",
  stepTwo: "step 2 of roles/pm.md still starts at step 2",
};
const rowId = (expected) => `the table routes it: ${expected.id}`;

function audit(text) {
  const results = [];
  const add = (id, ok, detail = "") => results.push({ id, ok, detail });

  let lane = null;
  let sectionError = "";
  try {
    lane = tableBlock(section(text, HEADING), HEADER[0]);
  } catch (error) {
    sectionError = String(error?.message ?? error);
  }
  add(
    ID.section,
    lane !== null && lane.length > 0,
    `${sectionError} — step 1 moved or was renamed, or its table is gone, so the routing table `
      + "could not be judged where it lives",
  );

  const rows = tableRows(lane ?? "");
  {
    // The header is the only part of the table that is not a data row, so it is
    // read back from the file rather than assumed.
    const headerLine = (lane ?? "").split("\n").find((line) => lower(line).includes("| the work "));
    const headerCells = (headerLine ?? "").split("|").map((cell) => cell.trim()).filter(Boolean);
    add(
      ID.header,
      headerCells.length === 4 && headerCells.every((cell, index) => lower(cell) === HEADER[index]),
      `the table's header reads ${JSON.stringify(headerCells)}, expected ${JSON.stringify(HEADER)}`,
    );
  }
  add(
    ID.rows,
    rows.length === EXPECTED.length,
    `${rows.length} row(s) found, ${EXPECTED.length} expected. A row added or removed without changing this `
      + "case means one kind of work has no route written down: "
      + JSON.stringify(rows.map((row) => row.cells[0])),
  );
  add(
    ID.empty,
    rows.every((row) => row.cells.every((cell) => cell !== "")),
    "a row leaves one of its four cells empty, so that answer is not written down at all: "
      + JSON.stringify(rows.filter((row) => row.cells.some((cell) => cell === "")).map((row) => row.cells)),
  );
  const badRoute = rows.filter((row) => !ROUTES.includes(routeOf(row.cells[1])));
  add(
    ID.vocabulary,
    badRoute.length === 0 && rows.length > 0,
    `these rows name a route that is not one of ${ROUTES.join(", ")}: `
      + JSON.stringify(badRoute.map((row) => [row.cells[0], row.cells[1]])),
  );
  const badSecurity = rows.filter((row) => securityKind(row.cells[2]) === "other");
  add(
    ID.security,
    badSecurity.length === 0 && rows.length > 0,
    "these security cells answer in a shape this table does not use, so the answer cannot be read as yes "
      + `or no: ${JSON.stringify(badSecurity.map((row) => [row.cells[0], row.cells[2]]))}`,
  );

  // The Route column is about how many roles the change gets. User input is not a
  // reason to change that number, so the word may not appear there at all.
  const inputRoutes = rows.filter((row) => /\binput\b/i.test(row.cells[1]));
  add(
    ID.noInput,
    inputRoutes.length === 0 && rows.length > 0,
    "a Route cell names user input, which is the reading this task removed: taking input is not a reason "
      + `to open the full crew: ${JSON.stringify(inputRoutes.map((row) => row.cells[1]))}`,
  );

  // The two columns have to be two decisions. Same route, different security
  // answer, in one table, is the evidence that they really are.
  const byRoute = new Map();
  for (const row of rows) {
    const route = routeOf(row.cells[1]);
    const kinds = byRoute.get(route) ?? new Set();
    kinds.add(securityKind(row.cells[2]));
    byRoute.set(route, kinds);
  }
  const split = [...byRoute.entries()].filter(([, kinds]) => kinds.size > 1);
  add(
    ID.independence,
    split.length > 0,
    `every route in the table carries one security answer only (${JSON.stringify([...byRoute].map(([route, kinds]) => [route, [...kinds]]))}), `
      + "so the two columns cannot be told apart from each other",
  );

  // The rows this task fixed, looked up by what they are about.
  const found = new Map();
  for (const expected of EXPECTED) {
    const row = rows.find((candidate) => lower(candidate.cells[0]).includes(expected.needle));
    found.set(expected, row);
  }
  for (const expected of EXPECTED) {
    const row = found.get(expected);
    add(
      rowId(expected),
      row !== undefined
        && routeOf(row.cells[1]) === expected.route
        && securityKind(row.cells[2]) === expected.security,
      row === undefined
        ? `no row is about ${JSON.stringify(expected.needle)}, so that kind of work has no route written down`
        : `the row reads route ${JSON.stringify(routeOf(row.cells[1]))} / security `
          + `${JSON.stringify(securityKind(row.cells[2]))}, expected ${JSON.stringify(expected.route)} / `
          + `${JSON.stringify(expected.security)}`,
    );
  }

  // The one conclusion the table draws in prose, checked as its own sentence.
  const settingsRow = found.get(EXPECTED[3]);
  const uiRow = found.get(EXPECTED[4]);
  add(
    ID.soloNotCrew,
    settingsRow !== undefined && uiRow !== undefined
      && routeOf(settingsRow.cells[1]) === "solo"
      && routeOf(uiRow.cells[1]) === "solo",
    "an ordinary settings UI, or one that also touches a login, is routed higher than `solo`: "
      + JSON.stringify([settingsRow?.cells[1], uiRow?.cells[1]]),
  );

  // The routing rules live in step 1, and this repository's checks cut steps out
  // of this file with `step(text, N)` — which finds `^N. **` at the start of a
  // line. So a numbered list written as prose inside step 1 re-points EVERY
  // step-based case at this section instead of the step it names. That is not
  // hypothetical: the ordering sentence above was a `1.`/`2.` list while this table
  // was being written, and `qa/T-64/case-01` went red because `step(text, 2)` had
  // started matching the list instead of step 2. The shape is pinned here, next to
  // the reason, and step 2 is checked as the witness.
  const stray = (lane ?? "").split("\n").filter((line) => /^\d+\. \*\*/.test(line));
  add(
    ID.noStrayNumbers,
    stray.length === 0,
    `step 1 holds a top-level numbered item: ${JSON.stringify(stray)} — every step-based case in this `
      + "repository reads `^N. **`, so a list numbered here silently becomes that step",
  );
  let stepTwo = "";
  try {
    stepTwo = step(text, 2);
  } catch { /* the check below reports it */ }
  add(
    ID.stepTwo,
    /^2\. \*\*Interview/.test(stepTwo),
    `step(text, 2) starts with ${JSON.stringify(stepTwo.slice(0, 80))} — the step cut moved, so every case `
      + "that judges step 2 by number is now judging something else",
  );

  return results;
}

// cells, not the file body: this rule file is followed by the playbooks, and a
// needle match that ran past the table's last row would find the playbook copies.

function tableBlock(text, headerFirstCell) {
  const lines = text.split("\n");
  const start = lines.findIndex((line) => lower(line).includes(`| ${headerFirstCell} `));
  if (start < 0) return "";
  const block = [];
  for (const line of lines.slice(start)) {
    if (!line.trim().startsWith("|")) break;
    block.push(line);
  }
  return block.join("\n");
}

// ------------------------------------------------------------- the real files

const text = pm();
const rows = tableRows(tableBlock(section(text, HEADING), HEADER[0]));
console.log(`      the routing table: ${rows.length} row(s), routes ${JSON.stringify([...new Set(rows.map((row) => routeOf(row.cells[1])))])}`);

for (const result of audit(text)) check(result.id, result.ok, result.detail);

// --------------------------------------------- the playbook's copy of the table
//
// Same subject, same route, same security answer, said the same way. The scan is
// deliberately narrower than the audit above: it compares the two tables row by row
// on the columns that decide, and leaves the playbook's own extra prose alone.

const PLAYBOOK = "roles/playbooks/crew-routing.md";

/** Compare the core's table with one copy of it. `read(relative)` reads a repository file. */
function tableDrift(coreText, read) {
  const coreRows = tableRows(tableBlock(section(coreText, HEADING), HEADER[0]));
  const playbookRows = tableRows(tableBlock(read(PLAYBOOK), HEADER[0]));
  const subjectKey = (cell) => lower(clean(cell)).replace(/[’']/g, "'");
  const bySubject = (rows) => new Map(rows.map((row) => [subjectKey(row.cells[0]), row]));
  const coreIndex = bySubject(coreRows);
  const playbookIndex = bySubject(playbookRows);
  const drift = [];
  for (const [subject, core] of coreIndex) {
    const copy = playbookIndex.get(subject);
    if (copy === undefined) { drift.push([subject, "missing from the playbook"]); continue; }
    if (routeOf(copy.cells[1]) !== routeOf(core.cells[1])) drift.push([subject, "route", core.cells[1], copy.cells[1]]);
    if (securityKind(copy.cells[2]) !== securityKind(core.cells[2])) drift.push([subject, "security", core.cells[2], copy.cells[2]]);
  }
  return { drift, coreRows, playbookRows };
}

{
  const { drift, coreRows, playbookRows } = tableDrift(text, repoFile);
  check(
    `the ${PLAYBOOK} copy of the routing table is there (${playbookRows.length} row(s))`,
    playbookRows.length > 0 && coreRows.length > 0,
    `${PLAYBOOK} no longer holds a four-column table under "${HEADER[0]}", so the PM reads the routing `
      + "table from one file and cannot compare it with anything",
  );
  check(
    `the ${PLAYBOOK} copy answers every row the way ${HEADING} does`,
    drift.length === 0 && coreRows.length > 0,
    "the two copies of the routing table have drifted apart — a route must not be `direct` in one file and "
      + "`crew` in the other, and a security answer the core accepts must not be words the core's own "
      + `vocabulary cannot read: ${JSON.stringify(drift)}`,
  );
  check(
    `the ${PLAYBOOK} copy spells the security answer the way the core does`,
    playbookRows.length > 0 && playbookRows.every((row) => securityKind(row.cells[2]) !== "other"),
    "a security cell in the playbook uses words the core's own table does not: "
      + JSON.stringify(playbookRows.filter((row) => securityKind(row.cells[2]) === "other").map((row) => [row.cells[0], row.cells[2]])),
  );
}

// -------------------------------------------------------------- the mutations
//
// Two breakages, each in its own copy of the repository and each judged by the same
// function the checks above use: the ordinary settings UI is raised to the whole
// crew (which is the rule this task removed), and the playbook's security cell is
// reworded away from the core's answer. Without the second one, this case would
// still pass on a playbook table that had stopped meaning the same thing.

const dir = tempRepo();
let brokenRows;
let driftedCopy;
try {
  edit(
    dir,
    "roles/pm.md",
    "An ordinary settings UI: a form, a dropdown, a page that takes user input | `solo`",
    "An ordinary settings UI: a form, a dropdown, a page that takes user input | `crew`",
  );
  brokenRows = audit(copyFile(dir, "roles/pm.md"));
  const readMutatedCore = copyFile(dir, "roles/pm.md");
  edit(dir, PLAYBOOK, "| the closed risky list decides |", "| the core's own security list decides |");
  driftedCopy = tableDrift(readMutatedCore, (relative) => copyFile(dir, relative));
} finally {
  cleanUp(dir);
}

const failed = brokenRows.filter((result) => !result.ok).map((result) => result.id);
check(
  "mutation: routing an ordinary settings UI to `crew` turns that row of the table red",
  failed.includes(rowId(EXPECTED[3])),
  `failed checks were ${JSON.stringify(failed)} — the row was raised to \`crew\` in the copy and this case `
    + "still passed on it",
);
check(
  "mutation: rewording the playbook's security cell turns the two-table comparison red",
  driftedCopy.drift.length > 0,
  `the playbook's security cell was reworded and the comparison found ${JSON.stringify(driftedCopy.drift)} — `
    + "a comparison that cannot see this is not reading the playbook's table at all",
);

done();
