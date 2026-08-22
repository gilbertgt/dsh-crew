// M1 DoD item 5: docs/qa/gaps.md carries the hole this milestone knowingly
// shipped — the shell that reads CHANGELOG.md has no test executing it — and
// the manual command that is the only way back from the state interview answer 3
// leaves behind.
//
// Why a case and not a reader: the entry IS the deliverable. Everything else in
// M1 is machine-checked, so the one thing nobody would notice going missing is
// the written-down admission that a piece of it is not. gaps.md says at its own
// top that a plan is dropped once the cases exist and that this file is where
// the untestable part of the plan moves to. A gap nobody wrote down is a gap the
// next QA rediscovers from scratch.
//
// The four strings below are read inside ONE section, not across the file. Three
// of them already appear elsewhere in gaps.md for unrelated reasons — item 11
// names `gh release create` while discussing what host/git-guard.js recognises —
// so a whole-file search would have been green before this milestone started.
//
// docs/qa/gaps.md is the PM's file. QA never writes it; QA reports the lines and
// the PM writes them. This case only reads.

import { check, done, repoFile } from "../lib/qa.mjs";

const GAPS = "docs/qa/gaps.md";
const text = repoFile(GAPS);

// Cut the file into `## ` sections — the shape it already uses for one gap —
// while walking fenced code blocks and never cutting inside one.
//
// A gap entry may show a command, and a command may show a markdown heading:
// item 54 itself carries a `sed` snippet that reads `## ` out of CHANGELOG.md.
// The day somebody puts such a heading at the start of a line inside a fence,
// a plain split cuts that one entry in half and scatters the four strings below
// across the pieces — measured, not guessed: with a `## 0.10.0 — …` line added
// inside item 54's snippet, this case went red with the four needles spread over
// three fragments. That is a case failing over something it is not about, on a
// gaps.md that is perfectly correct. docs/qa/lib/qa.mjs walks fences the same
// way and for the same reason (`editFirstVerdicts`).
const sections = [];
let fenced = false;
for (const line of text.split("\n")) {
  if (/^\s*```/.test(line)) fenced = !fenced;
  else if (!fenced && line.startsWith("## ")) sections.push([]);
  if (sections.length) sections[sections.length - 1].push(line);
}
const bodies = sections.map((lines) => lines.join("\n"));
check(`${GAPS}: it is a list of \`## \` sections`, bodies.length > 0, `found ${bodies.length}`);
// An unbalanced fence would silently swallow every heading after it, leaving one
// giant "section" in which all four strings meet by accident — a false green.
check(
  `${GAPS}: its code fences are balanced, so the walk above ended outside one`,
  !fenced,
  `${text.split("\n").filter((line) => /^\s*\`\`\`/.test(line)).length} fence line(s), which is odd`,
);

const NEEDLES = [
  { what: "the workflow it is about", needle: /publish\.yml/ },
  { what: "the file the shell reads", needle: /CHANGELOG\.md/ },
  { what: "the manual command that is the only way back", needle: /gh release create/ },
  { what: "the admission that nothing tests it", needle: /没有任何(测试|用例|检查)/ },
];

const matching = bodies.filter((body) => NEEDLES.every(({ needle }) => needle.test(body)));

check(
  `${GAPS}: one section carries the whole gap — ${NEEDLES.map(({ what }) => what).join("; ")}`,
  matching.length >= 1,
  // A failure has to be actionable, so it says which halves each near miss holds.
  bodies
    .map((body) => ({ heading: body.split("\n")[0], hits: NEEDLES.filter(({ needle }) => needle.test(body)) }))
    .filter(({ hits }) => hits.length >= 2)
    .map(({ heading, hits }) => `${heading}\n        has: ${hits.map(({ what }) => what).join(", ")}`)
    .join("\n      ") || "no section holds two or more of them",
);

if (matching.length >= 1) {
  const entry = matching[0];
  // The file's own rules, at its top: every gap says what cannot be checked, why,
  // what to do about it, and where it stands. A gap with no status is a gap
  // nobody can tell has been closed.
  check(
    `${GAPS}: that section carries a **状态** line, the shape the file asks of every gap`,
    /\*\*状态\*\*/.test(entry),
    entry.split("\n").slice(0, 3).join("\n"),
  );
  // The hole is a choice, not an oversight, and the entry has to say so — the
  // next person to read it will otherwise "fix" it by writing the test the user
  // declined.
  check(
    `${GAPS}: it records that this was chosen, not overlooked (the 2026-08-22 interview)`,
    /2026-08-22/.test(entry) && /(面谈|用户)/.test(entry),
    entry.split("\n").slice(0, 12).join("\n"),
  );
}

done();
