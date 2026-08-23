# qa — QA methodology for a prompt-as-code plugin

This folder holds **every QA case this repository has ever run, past and present**,
plus the shared machinery that runs them and the standing list of what no case can
check. It is the QA half of `npm test` (`scripts.test` runs
`bash qa/run-all.sh` between the project checks and the Verdicts gate), and
`.github/workflows/test.yml` runs it on every push.

The product under test is a **prompt-as-code plugin**: the deliverables are prompt
files (`roles/*.md`) and host modules (`host/*.js`), not a library with a public
API. There is nothing to call and nothing to render, so the cases verify two
things instead:

- **the shipped text** — a string is present, a structure holds, one section sits
  before another;
- **the behaviour of the host modules and the check scripts** — by importing a
  module in-process and driving it on a fake context, or by running a `tools/`
  script against a mutated *copy* of the repository and reading its output.

What a case can never judge — whether prose is clear or right — is written down in
`gaps.md` and left to a human reader (the doc reviewer). A case that "pinned" an
opinion about wording would only produce a green light that proves nothing.

## Layout

```
qa/
├── README.md          this file — the methodology
├── run-all.sh         one runner for every task's cases (finds the T-*/run.sh files itself)
├── gaps.md            the standing list of what no runnable case can check
├── lib/
│   └── qa.mjs         shared helpers for the cases (not a case itself)
└── T-<task-id>/       one folder per task that had QA
    ├── run.sh         runs that task's cases; exit 0 only when all of them pass
    ├── case-01-*.mjs  one runnable case — the only files a runner executes
    ├── case-02-*.mjs
    └── baseline.mjs   (in some folders) a shared helper for that task, never run
```

As of this writing there are 40 task folders, 285 `case-*.mjs` files, and 62
entries in `gaps.md`. The numbers move as jobs add cases; the shape does not.

## The three layers of runner

### `T-*/case-*.mjs` — the unit of QA

A case is a plain Node ES module. It imports helpers from `../lib/qa.mjs`, runs
some checks, and calls `done()`; `done()` prints the totals and exits non-zero
when any check failed, which is how the shell layers above learn the case's
verdict.

Only files named `case-*.mjs` are executed. A file in a task folder that is
**not** named that way — `baseline.mjs` is the example that exists today — is a
shared helper for that task's cases and is never run on its own.

A case's name should say what it pins (`case-01-step-17-exists.mjs`,
`case-26-repo-diff-scope.mjs`), because the per-task runner prints the file name
before it runs it.

### `T-*/run.sh` — one task's cases

Each task folder has its own `run.sh`:

```bash
for case_file in "$here"/case-*.mjs; do
  [ -e "$case_file" ] || continue
  ...
  if ! node "$case_file"; then failed=$((failed + 1)); fi
done
echo "T-110: $cases case(s), $((cases - failed)) passed, $failed failed"
[ "$failed" -eq 0 ]
```

It finds its cases with a wildcard, so a new `case-*.mjs` in the folder is picked
up **without this file being edited**. It counts the cases, runs each one with
`node`, prints one summary line per task, and exits 0 only when every case
passed.

### `qa/run-all.sh` — every task's cases at once

The shared runner does exactly what its header says:

> It finds each qa/*/run.sh by itself, so a new task never needs this file
> edited.

```bash
while IFS= read -r runner; do
  task="$(basename "$(dirname "$runner")")"
  ...
  if bash "$runner"; then echo "PASS  $task"; else echo "FAIL  $task"; ...; fi
done < <(find "$here" -mindepth 2 -maxdepth 2 -name run.sh | sort)

echo "crew QA: $tasks task(s) run, $((tasks - failed)) passed, $failed failed"
```

So:

- it discovers the task runners itself with `find -mindepth 2 -maxdepth 2
  -name run.sh`, sorted by path — a new `T-<n>/run.sh` needs no change here;
- `-mindepth 2` is why `run-all.sh` itself (depth 1) is not its own input;
- each task runs under `bash`, and the task id in the banner is the runner's
  parent folder name (`basename "$(dirname "$runner")"`);
- per task it prints `=== <task> ===` before running and `PASS`/`FAIL` after;
- one summary line at the end — `crew QA: N task(s) run, X passed, Y failed` —
  and `exit 1` naming the failed tasks when any of them failed, `exit 0`
  otherwise.

## `lib/qa.mjs` — the shared helpers

`lib/qa.mjs` is **not a case**: the runners only execute files named
`case-*.mjs`, and this file is not one. Cases import the pieces they need
(`import { check, done, flat, repoFile } from "../lib/qa.mjs"`).

Its first commitment, stated at the top of the file:

> Everything here is read-only against the repository. Anything that has to
> change a file copies the repository into a throwaway folder first, and every
> helper that needs a home folder points DSH_HOME at a temporary folder, so no
> case ever reads or writes the real ~/.dsh.

The helpers fall into five groups:

**Reading the repository** — `REPO` (the repository root, derived as
`qa/lib` up two), `repoFile(relative)` (one file as text), `pm()` (the PM
prompt file, the deliverable most checks are about), `step(text, number)` (one
numbered step of the PM prompt, delimited by the next `N. **` at line start),
`section(text, heading)` (one `## heading` section of a markdown file, up to the
next `## `), `flat(text)` (collapse every run of whitespace, so a prose check
does not depend on where the line wraps).

**Asserting** — `check(what, condition, detail)` (one assertion; prints
`ok    <what>` or `FAIL  <what>`, with the detail only on failure), `done()`
(prints the totals and exits non-zero when anything failed), and the run-level
assertions `failLines`, `okLines`, `saidOk`, `expectRed`, `expectGreen`. The
run-level ones exist because **a red is only a red when a `FAIL` line names the
thing** — a copy that cannot even start the script exits non-zero too, and an
exit-code-only assertion would read that crash as "the pin caught it". So
`expectRed(run, needle, what)` demands both halves: exit non-zero **and** a
`FAIL` line containing `needle`.

**Sandboxing** — `tempDir(prefix)` (a throwaway folder in the OS tmp),
`tempRepo()` (a copy of the parts of the repository the check scripts read —
`package.json`, `cordis.patch.yml`, `host/`, `roles/`, `preset/`, `tools/`,
`.github/`, `docs/design/tasks.md`; `node_modules` is symlinked, never copied),
`runCheck(dir, script)` (run one of the project's check scripts inside such a
copy with `DSH_HOME` and `HOME` pointed at a throwaway folder), `cleanUp(dir)`
(remove the folder whatever happened).

**Mutating a copy** — `copyFile`, `edit` (replace `from` with `to` exactly
once), `editAll` (every occurrence), `keepCopies` (leave exactly `keep` copies —
for the count pins, which have a floor rather than an exact number), `put`,
`drop`, `rename`, `editJson`, and `editFirstVerdicts` (find the first `## T-<n>`
section of the task table that carries a Verdicts line and change that line).
These exist to prove a pin is a pin: **breaking the thing a case guards must
turn the run red**, and the breaking happens inside a `tempRepo()` copy, never
in the repository. Every one of them **throws when its anchor is not there** —
an edit that silently matched nothing would leave the copy correct, the check
green, and the case reporting a pass for a pin it never touched.

**Mounting the real modules** — `mountGuard(config)` (mount `host/git-guard.js`
on a fake Cordis context and return a runner, with the approval file and the
target repo in a throwaway folder), `APPROVAL_RULE` (the phrase the
approval-file rule — and only that rule — puts in its reason), and
`mountCrew(config)` (mount `host/crew.js` on a fake Cordis context and collect
what it registered and what it wrote to the boot log, with the jobs folder in a
throwaway path).

## `gaps.md` — what no case can check

`gaps.md` is the **standing** list of things in this product that cannot be
decided by a runnable case. It is not a record of one job: it is grouped by
*what kind of thing* cannot be checked, not by task id, so a reader a year later
is not asked to remember what `T-05` was. Each entry carries four parts: the
gap (what cannot be checked), why, what to do about it, and its status.

Its source is QA's test plans. A plan is single-use — it dies when the cases it
planned are written — but the part that says "we could not test this, and why"
is durable, so the rule is: **before a plan is dropped, that paragraph is merged
into this file**. If the same gap is already listed, no new entry is added.

The oldest entry is the shape of the whole methodology: "whether a document is
*right*" cannot be decided by a case. A case can assert that a string is
present; it cannot assert that a sentence is clear, complete or true. Pinning
the words would only freeze a few specific strings and report a green light for
a text nobody judged. That class of check needs a reader — `crew-doc-reviewer`
or the user — not a case.

## How the cases verify a prompt-as-code plugin

1. **Pin the shipped text.** The prompt files are the product, so cases read
   them with `repoFile`/`pm` and assert on structure: a required step exists,
   a section sits where the flow needs it, a phrase the DoD names is present
   (usually through `flat()`, so a wrapped line cannot dodge or trip the check).
   The checks deliberately pin *concepts and DoD-named strings*, never the whole
   sentence, so a rewrite that keeps the meaning does not go red and a rewrite
   that drops the meaning cannot pass.
2. **Prove the guards are live.** The project's `tools/verify-*.mjs` scripts
   are themselves guarded: a case copies the repository into a throwaway folder,
   breaks the thing a script is supposed to catch (`edit`, `drop`, `rename`,
   `editJson`, ...), runs the script inside the copy with a fake `DSH_HOME`,
   and asserts the run is red *and* names the broken thing. That is the
   mutation test that makes "guarded" mean something: if breaking the rule did
   not turn the run red, the case fails.
3. **Drive the host modules.** For behaviour that no script checks — the git
   guard's refusals, what the crew plugin registers — a case imports the real
   module and mounts it on a fake Cordis context (`mountGuard`, `mountCrew`),
   with the approval file, jobs folder and home all in throwaway locations, so
   nothing touches the real `~/.dsh`.
4. **Stay read-only against the repository.** Any case that must change a file
   does it in a `tempRepo()` copy and cleans the copy up afterwards. The whole
   suite runs against temporary folders and a throwaway `DSH_HOME`.

Some cases read this repository's own git history (for example, which commits a
job's task markers sit in). That is why CI checks out with `fetch-depth: 0`:
the default shallow clone has no history for them to read.

## Adding a new task's cases

1. Create `qa/T-<task-id>/`.
2. Write one `case-NN-<short-name>.mjs` per behaviour, importing from
   `../lib/qa.mjs`.
3. Add a `run.sh` in that folder that wildcards `case-*.mjs` and exits 0 only
   when all of them pass (copy the pattern from any existing task).
4. Nothing else: `run-all.sh` finds the new `run.sh` by itself, and
   `npm test` / CI pick the whole suite up through `scripts.test`.

When a case finds something that **cannot** be checked, the finding goes into
`gaps.md` — not into a case that would lie about it.
