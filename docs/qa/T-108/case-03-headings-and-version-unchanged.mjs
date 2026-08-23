// T-108 DoD items 4 and 5: the section structure of both READMEs is what it was
// before this job — the edits went inside paragraphs that already existed — plus
// the ONE section T-114 was written to add, and the version line still matches
// `package.json`.
//
// What it proves: a rule that arrived as a NEW `## ` section would have been a
// second place the same thing is said, and the two pages would have drifted the
// first time somebody edited one of them. `docs/qa/T-59/case-07` already checks
// that the two files have the SAME shape as each other; this case checks that the
// shape is the one they had BEFORE, which case-07 cannot see — both files gaining
// an UNDOCUMENTED section together passes case-07 and fails this.
//
// THE ONE DOCUMENTED EXCEPTION (T-114, recorded in its DoD in
// `docs/design/tasks.md`): T-114 added `## Quick start` to README.md and
// `## 快速开始` to README-zh.md. Those two headings are the ONLY additions this
// case allows. Anything else added, anything removed, or a pre-existing section
// moved out of order is still a red. The relaxation is deliberate and job-made,
// so it changes ONLY the section-set/section-order assertions below; the version
// half of this case is untouched.
//
// The version half is here because this milestone does not ship: `0.9.0` is
// already published, so the number must not move. `docs/qa/T-59/case-09` pins the
// line's wording; this pins it against `package.json`, which is what a reader
// would actually be misled by.
//
// What it does NOT prove: that the paragraphs the edits went into were the right
// ones. A doc reviewer judges that.
//
// PINNING STYLE: LINE-BASED for headings (a `## ` heading cannot wrap) against
// `git show <start commit>`, and an exact string comparison for the version.

import { before, headingLines } from "./baseline.mjs";
import { check, done, repoFile } from "../lib/qa.mjs";

// T-114's additions (see its DoD in docs/design/tasks.md): the only headings this
// case allows the READMEs to have gained since the start commit.
const documented = {
  "README.md": ["## Quick start"],
  "README-zh.md": ["## 快速开始"],
};

for (const path of ["README.md", "README-zh.md"]) {
  const now = headingLines(repoFile(path));
  const was = before(path);

  check(
    `the start commit's ${path} is readable, so this half has a BEFORE at all`,
    was.ok,
    was.ok ? "" : was.why,
  );

  check(
    `${path} really has sections`,
    now.length > 5,
    `${now.length} heading(s) found — the file was not read, so a match below would mean nothing`,
  );

  if (!was.ok) continue;
  const then = headingLines(was.text);
  console.log(`${path}: ${then.length} heading(s) at the start commit, ${now.length} now`);

  const added = now.filter((line) => !then.includes(line));
  const removed = then.filter((line) => !now.includes(line));

  check(
    `${path} lost no section`,
    removed.length === 0,
    `removed: ${removed.join(" | ") || "none"}`,
  );

  check(
    `${path} gained only the documented Quick start section`,
    added.length === documented[path].length
      && added.every((line, index) => line === documented[path][index]),
    `added: ${added.join(" | ") || "none"}\n      allowed: ${documented[path].join(" | ")}`
      + "\n      T-114's Quick start is the only documented exception (see its DoD)",
  );

  check(
    `${path} kept its pre-existing sections in the same order`,
    now.filter((line) => !documented[path].includes(line)).join("\n") === then.join("\n"),
    "a pre-existing section moved — the two pages are compared position by position elsewhere",
  );
}

// ------------------------------------------------------------- the version
const version = JSON.parse(repoFile("package.json")).version;

console.log(`package.json version: ${version}`);

check(
  "package.json still holds the published version this milestone does not move",
  version === "0.9.0",
  `it holds ${version} — M1 of skip-and-split ships nothing, so a bump here is a separate decision`,
);

for (const [path, pattern] of [
  ["README.md", /^> \*\*Version (\S+?)\.\*\*/m],
  ["README-zh.md", /^> \*\*(\S+?) 版本。\*\*/m],
]) {
  const hit = pattern.exec(repoFile(path));
  check(
    `${path} carries a version line`,
    hit !== null,
    "no version line matched — a reader has no way to tell which release the page describes",
  );
  if (hit) {
    check(
      `${path}'s version line says ${version}`,
      hit[1] === version,
      `the page says ${hit[1]}, package.json says ${version}`,
    );
  }
}

done();
