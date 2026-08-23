# Security

dsh-crew is a plugin for DeepSeek Harness (dsh). It turns a dsh session into a
"crew": the session becomes a product manager (PM) that starts role agents
(engineers, reviewers, QA, and the rest) as its direct children.

This file describes the two guards the plugin adds, what each one blocks, and —
just as honestly — what each one does not block. Neither guard is airtight, and
this file says so plainly. If you find a hole, see
[Reporting a security issue](#reporting-a-security-issue).

## What the guards are

Both guards are middleware on dsh's `tools/execute`, mounted by the plugin's
host bundle (`cordis.patch.yml`). They exist because a rule written in prose is
advice, while a `tools/execute` wrapper is the place a call is actually stopped.
Both read the text of a tool call and match it against patterns. Both are
described in their own source as "a strong seat belt, not a locked door", and
both leave the real gate where it always is: dsh's own approval prompts, which
you see in the GUI and answer yourself.

Both guards are configurable from the profile's `cordis.patch.yml` and can be
disabled entirely (`enabled: false`). They protect by default; they are not a
property of the machine.

## The git guard (`host/git-guard.js`)

The git guard blocks the shell commands that can push work off the machine or
publish a package.

### Who is guarded

- Every crew role — any child agent with a parent execution token — is fully
  guarded.
- The root agent — your own session, the PM — is trusted by default
  (`trustRootAgent: true`) and passes straight through. Setting
  `trustRootAgent: false` guards the PM exactly like a child.
- What the guard allows for the PM is not what the PM does: the PM's own rules
  (`roles/pm.md`) require your yes for every push and never force push `main`
  at all. The playbook is a tighter limit than the guard.

### What it always refuses

From a crew role:

- `git push` of `main`, `master`, `trunk`, `develop` or `HEAD`, or a push with
  no branch named (a bare `git push` can push whatever branch is checked out)
- any tag push, delete push, `--mirror`, `--all`, or force push
- `npm publish`, `pnpm publish`, `yarn publish`, `bun publish`, `npm dist-tag`,
  or `gh release create`
- a push into a repository whose GitHub Actions CI runs on a branch push and
  looks like it publishes (`.github/workflows` only — see the limits below)

From every agent, your own session included:

- any shell command that names the one-shot approval file

### What it allows, once per approval

A child may push any *other* branch, but only while the one-shot approval file
(`~/.dsh/crew/push-ok`) exists. Only you create that file, in your own
terminal; the guard deletes it as soon as one push uses it, so one approval
means one push. A refused agent is deliberately never told how to create the
file — an agent that can write files could follow the recipe on its own, and
the guard would never see that call.

### Honest limits

Each of these is a real hole, not a caveat:

- **It reads command text.** A push hidden inside a script file, or made after
  changing the remote first, is not seen. It is a strong seat belt, not a
  locked door. Your dsh approval prompts remain the real gate.
- **It wraps `bash` and `pwsh` and nothing else.** A role that has `write` or
  `edit` — the engineer does — can create the approval file as a plain file
  write, and this middleware never sees that call. The gate there is dsh's own
  approval prompt for writing a file.
- **The publishing scan reads `.github/workflows` and nothing else**, and it
  understands GitHub's `on: push:` shape. GitLab, CircleCI, Jenkins and Azure
  Pipelines are outside it on purpose: stretching GitHub trigger logic half-way
  onto another CI system would produce false alarms, and a false alarm is worse
  than no alarm, because it teaches you to say yes without reading. So the
  guard is a GitHub-only backstop for child agents. The wider check is the
  PM's own judgement, in step 17 of `roles/pm.md`, which reads those other CI
  files too.
- **On the approval-file rule, two sharp edges.** A command that only *mentions*
  the file name is refused, the PM included — a commit message or a `git log
  --grep` that contains the name is blocked as a false positive. And a name the
  shell assembles from pieces still gets through:
  `echo push-ok-flow | sed s/-flow// | xargs touch` is not stopped.

## The PM write guard (`host/pm-write-guard.js`)

The PM write guard stops the root agent — your own session, the PM — from using
the `write` and `edit` tools on files that belong to crew roles. The PM had
repeatedly edited files it was not allowed to edit; the guard makes that
impossible instead of merely forbidden.

### Who is guarded

- Only the root agent is guarded. Every crew role carries a parent execution
  token and passes straight through — a role writing its own task's files is
  the normal flow and is never touched.
- Only the `write` and `edit` tools are intercepted; everything else runs
  unhindered.

### What is whitelisted

A path on the PM's whitelist passes straight through, no approval asked. The
whitelist is hard-coded in the guard, and pinned by
`tools/verify-pm-write-guard.mjs`; it is not read from `tasks.md`, so a change
to the rules text cannot move the guard:

- `docs/design/prd-*.md` — the opening document of a job
- `docs/decisions/crd/*.md` — change request documents
- `docs/decisions/adr/*.md` — decision records
- `docs/design/tasks.md` — the task table, whole file
- `qa/run-all.sh` and `qa/gaps.md` — the shared QA runner and the
  standing gap list
- `CLAUDE.md`, `principles.md` — the project rules and the principles
- `roles/pm.md` — the PM's own rules file
- `<jobsDir>/*/state.json` — job state files, outside the repository

Everything else — product code under `host/` and `tools/`, the other roles'
rule files, interface contracts under `docs/design/api/`, QA's cases under
`qa/T-*/`, the READMEs, `package.json` — is refused and asked to you.

### What happens when it refuses

A protected write goes through dsh's own user-approval channel: you see an
approval prompt in the GUI for *this one* write, and you approve or reject it.
Every write is asked for separately. The prompt and the refusal name the real
target (symlinks resolved), with the typed path in parentheses when the two
differ.

### Honest limits

- **It reads the file-path text of `write` and `edit` calls, and only those
  two tools.** A file written through a shell command (`echo x > file`) never
  passes through this middleware — that lane is the git guard's territory and
  the playbook's, not this guard's. It is a strong seat belt, not a locked
  door.
- **Paths are matched by the normalized segments of the realpath'd target.** A
  symlink or `..` cannot smuggle a protected file past it — but the price is
  that a path whose *final segment* is `CLAUDE.md`, `principles.md` or
  `roles/pm.md`, and whose existing ancestors are not symlinks, is whitelisted
  wherever it sits. That is a deliberate trade: the guard stops the PM stepping
  on this repository's layout; it does not fence a hostile agent.
- **A deployment that composes no approval service fails closed**: the write is
  refused with a clear message instead of being allowed.

## The bottom line: not airtight

- Both guards read text — command text, or file-path text — and intercept a
  narrow lane (`bash`/`pwsh`, or `write`/`edit`). A determined agent with the
  shell can do things neither guard sees: hide a push in a script file, write a
  file with `echo`, assemble a file name from pieces. The guards were never
  designed to fence a hostile agent.
- Neither guard replaces your own attention. dsh's approval prompts are the
  real gate, and the crew's own rules (`roles/pm.md`) require your yes for
  every push, tag, publish, merge and branch delete. The guards are one layer
  of that system, not the whole of it.
- The guards constrain only agents inside a dsh session that has dsh-crew
  mounted. They say nothing about anything outside that session — other
  software on the machine, or a human running git themselves.

## Reporting a security issue

If you find a hole in either guard, or a way a role can exceed what its rules
allow, report it:

- **Where**: open an issue at <https://github.com/stuarthu/dsh-crew/issues>
  (the repository is public). If you prefer not to post publicly and the
  repository's private vulnerability reporting is enabled (Security tab →
  Report a vulnerability), use that instead.
- **What to include**: the dsh-crew version (from `package.json`), which guard
  is involved, the exact command or call, what you expected and what happened,
  and whether it affects one session or any deployment.
- **What happens next**: the report is read by the repository maintainer, and
  a confirmed problem is fixed like any other change in this repository —
  through the repository's normal change flow, with its review rounds.
