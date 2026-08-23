// T-110 DoD items 4 and 5: the top section is still headed
// `## 0.10.0 — unreleased` with no date filled in, and `package.json` still says
// `0.9.0`.
//
// What it proves: this milestone does not ship, and nothing in it has been
// dressed up as though it does. Both halves have teeth in this repository:
//
//   - `docs/qa/T-81/case-01-changelog-order.mjs` goes RED when the top section is
//     still marked `unreleased` while `package.json` already holds that version.
//     So bumping the version here without dating the heading breaks the release,
//     and `npm test` runs inside the tag's own workflow.
//   - filling the date in early is the other half of the same trap: the heading
//     would then claim a release that never happened, and the release workflow
//     reads its notes out of the section whose heading starts `## <version> `.
//
// What it does NOT prove: that the release will go out correctly when it does.
// That is T-81's ground and it already has cases.
//
// PINNING STYLE: LINE-BASED — a `## ` heading cannot wrap — plus an exact string
// comparison for the version, and a comparison against the job's start commit so
// "untouched" means untouched rather than "happens to look right".

import { before } from "./baseline.mjs";
import { check, done, repoFile } from "../lib/qa.mjs";

const HEADING = "## 0.10.0 — unreleased";

const text = repoFile("CHANGELOG.md");
const headings = text.split("\n").filter((line) => /^## /.test(line));
const top = headings[0];

console.log(`CHANGELOG.md version headings, newest first: ${headings.slice(0, 3).join(" | ")}`);

check(
  "CHANGELOG.md really has version headings",
  headings.length > 1,
  `${headings.length} found — the file was not read, so everything below would be vacuous`,
);

check(
  `the top heading is exactly "${HEADING}"`,
  top === HEADING,
  `it is ${JSON.stringify(top)} — either the version moved or a date was filled in early`,
);

check(
  "exactly one heading is marked unreleased",
  headings.filter((line) => /unreleased/i.test(line)).length === 1,
  "a second unreleased section means the release workflow can pick the wrong one for its notes",
);

check(
  "no date was written into the top heading",
  !/\d{4}-\d{2}-\d{2}/.test(top),
  "dating it claims a release that has not happened; the date goes in on the release day and not before",
);

// Reverse proof for that absence: the pattern must match where a date really is.
const dated = headings.slice(1).filter((line) => /\d{4}-\d{2}-\d{2}/.test(line));

check(
  "the date pattern really matches a dated heading, so the absence above is a fact",
  dated.length > 0,
  "no released section carries a date either — the pattern is not finding dates at all",
);

// ------------------------------------------------------------- the version
const version = JSON.parse(repoFile("package.json")).version;

console.log(`package.json version: ${version}`);

check(
  "package.json still holds 0.9.0",
  version === "0.9.0",
  `it holds ${version} — this milestone ships nothing, and a bump here is a separate decision the user makes`,
);

check(
  "the unreleased heading names a version ahead of package.json, not the same one",
  top.includes(version) === false,
  `the top section is marked unreleased AND names ${version}, the version package.json already holds`
    + " — that is the exact state docs/qa/T-81/case-01 turns red on, and it breaks the release run",
);

const was = before("package.json");

check(
  "the job's start commit is readable, so this case has a BEFORE at all",
  was.ok,
  was.ok ? "" : was.why,
);

if (was.ok) {
  check(
    "package.json is byte for byte what it was before this job",
    was.text === repoFile("package.json"),
    "package.json changed; DoD item 5 says not one character of it moves in this milestone",
  );
}

done();
