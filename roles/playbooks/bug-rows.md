# Playbook: a bug becomes a task row

What a bug's row holds — what was reported and its DoD section — and who writes it.

**Read this when:** a bug on the `crew` or `solo` route is about to be fixed.

This file is not loaded into your prompt. Read it with `read` at the moment the
job needs it, and only then — the rule you must never break lives in `roles/pm.md`,
which is always in front of you.

## A bug becomes a task row — on the `crew` and `solo` routes only

**On those two routes, a bug gets a task row of its own, and you write that row
before the fix starts.** A typo, a rename, a one-line change: on `crew` and on
`solo` every one of them is a task, and the row is written before any engineer or
QA sees it. Which routes those are was settled in step 1, before anything was
written, and this section does not reopen that choice.

**A `direct` bug gets no row, and nothing here may be read otherwise.** That
route's entire record is one test and the commit message (step 1). So this is not
a rule about bugs; it is a rule about the routes that carry a task row — the row
is what an engineer, QA and a reviewer read, and a `direct` change starts none of
them.

On `crew` and `solo`, before any engineer starts on a bug, you write its row in
`docs/tasks/` yourself. The row holds two things:

- **What was reported** — who reported it (the user, QA with its task id, a
  review) and what they saw: the command, the input, what happened, what they
  expected instead. This is what makes "this bug existed" survive. A report from
  a role is a message, and a message reaches no file: write it down or it is
  gone.
- **Its DoD section** — the failing case that must exist and pass, with the case
  file under `qa/<task-id>/` and the command that runs it, and the behaviour
  that must change.

**You write that DoD section, and it is there before the fix starts.** Never the
engineer who does the fix.

The reason is the rule, so keep it in front of you. Test first does produce a
test — but the person doing the fix writes it. That is exactly how a fix for a
symptom passes: the engineer writes a test for the behaviour it decided to fix,
and before it started, nobody else had said what "fixed" means. Two people, two
moments: you say what fixed means, then the engineer proves it.

Nothing else about a bug changes. The engineer still finds at least two ways
first; a difference that stays in the code comes back to you as a
`<job folder>/inbox/Q-<number>.md` file, you decide it and write the ADR; QA's
cases go under `qa/<task-id>/` and stay there; the commit names the task id,
and that id now points at a row that is still alive.
