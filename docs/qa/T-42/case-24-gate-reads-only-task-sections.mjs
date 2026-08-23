// T-42, DoD item 5c (6 of 6): the gate reads task sections and nothing else —
// one task per file under `docs/tasks/`, identified by the `T-<number>.md` file
// name and its `# T-<number>` top heading. The task table is a document ABOUT
// the Verdicts line — it has an appendix explaining the shape, fenced examples,
// and prose that uses the words `not run` and `skipped` — so a gate that read
// those would red a correct file on its own documentation.
//
// The assertion is the strongest one available here: the whole output, byte for
// byte, must be what the untouched copy printed. Not "still green" — identical,
// including the totals line. A gate that quietly counted an appendix line would
// still be green and would have moved the numbers.

import { readdirSync } from "node:fs";
import { join } from "node:path";
import { check, done, tempRepo, runCheck, cleanUp, copyFile, put, editFirstVerdicts, expectGreen, TASKS_MD } from "../lib/qa.mjs";

let baseline;
const dir = tempRepo();
try {
  const base = runCheck(dir, "tools/verify-tasks.mjs");
  expectGreen(base, "the untouched copy is green");
  baseline = base.out;
} finally {
  cleanUp(dir);
}

/** Apply a mutation and require the output to be identical to the baseline. */
const unchanged = (what, mutate) => {
  const copy = tempRepo();
  try {
    mutate(copy);
    const run = runCheck(copy, "tools/verify-tasks.mjs");
    check(
      what,
      run.status === 0 && run.out === baseline,
      `exit ${run.status}\n      --- got:\n      ${run.out.trim().split("\n").join("\n      ")}\n      --- expected:\n      ${baseline.trim().split("\n").join("\n      ")}`,
    );
  } finally {
    cleanUp(copy);
  }
};

/** Append text to one file inside a copy's `docs/tasks/` directory. */
const append = (dir, file, text) =>
  put(dir, `${TASKS_MD}/${file}`, `${copyFile(dir, `${TASKS_MD}/${file}`)}\n${text}\n`);

/** The first task file of a copy's task-table directory, or undefined. */
const firstTaskFile = (dir) =>
  readdirSync(join(dir, TASKS_MD)).filter((name) => /^T-\d+\.md$/.test(name)).sort()[0];

// In the one-task-per-file shape, a line "belongs to no task" exactly when it
// sits in a file the gate does not read — a name that is not `T-<number>.md`.
// `README.md` is that file here: the gate's name filter skips it wholesale, so
// Verdicts lines inside it must not move the output by one byte.

// A blatantly illegal Verdicts line under a non-task `## ` heading, in a file
// the gate does not read as a task.
unchanged("a fake Verdicts line under a non-task `## ` heading changes nothing", (copy) => append(copy, "README.md", `## 附录：这一行怎么读

- **Verdicts**：code: 也许吧
`));

// A Verdicts line after a late `# ` heading, still in a file that is no task.
unchanged("a Verdicts line after a late `# ` heading belongs to no task", (copy) => append(copy, "README.md", `# 附录

- **Verdicts**：security: not run
`));

// The words in prose, inside a REAL task file. This file explains the rule at
// length, so the words appear outside any Verdicts line — and they must not be
// counted. The gate matches the LINE SHAPE, not the words.
unchanged("`not run` and `skipped` in prose change nothing", (copy) => {
  const file = firstTaskFile(copy);
  if (file === undefined) throw new Error("no `T-<number>.md` task file in the copy — the directory's shape moved");
  append(copy, file, `## 附录：措辞

这一段里出现 not run、skipped、changes needed 这些词，但它们不是 Verdicts 行。
`);
});

// A fenced example INSIDE a real task section. Without the fence rule the
// `## T-99` heading would open a section of its own, and its illegal Verdicts
// line would be read as that section's record.
unchanged("a fenced `## T-99` example inside a task section is an example, not a section", (copy) => {
  editFirstVerdicts(copy, (line) => `${line}

\`\`\`markdown
## T-99 — 一个例子

- **Verdicts**：code: not run
\`\`\`
`);
});

done();
