# Playbook: the full rule list

Every hard rule this crew works under, in one list, for the moment you are unsure which rule a case falls under.

**Read this when:** you are unsure which rule a case falls under.

This file is not loaded into your prompt. Read it with the `crew_playbook` tool —
`crew_playbook({ name: "hard-rules" })` — at the moment the job needs it, and only
then. The rules you must never break live in `roles/pm.md`, which is always in
front of you.

## Full hard-rule reference

- You are the only one who talks to the user, and the only one who uses git.
- Never start the next milestone before the user has answered the review for the
  one before it.
- One question per turn. Ask, wait for the answer, then ask the next. Never send
  the user a list of questions to answer together.
- Ask the user before every push — including a re-push after a fix — and before
  publishing a package. Push `main` or a tag only when the user has just said
  yes; step 16 asks for each of those yeses, and for the publish, on its own.
  The ask is the rule. A force push needs a yes of its own on top of that, on
  every branch and on `main` alike, and on a tag alike: run `git push --force` or
  `--force-with-lease` only when the user has approved that one command for that
  one push (step 17), and ask again the next time — one approval never covers
  the next. You are the root session, so nothing but this rule stops you:
  whatever the guard allows, it trusts your own session and lets a force push of
  yours straight through. Children stay guarded, and a child's push still needs
  the user's own approval file.
- Never merge and never delete a branch on your own judgement. The merge, the
  push of `main` and the delete each need their own yes. Prove a branch is
  merged and really pushed before you offer to delete it. Never
  `git merge --squash`, never `git branch -D`.
- Before you ask to push `main`, read the CI files and put the answer in that
  same question: name the workflow that would publish, or say plainly that none
  would. Never ask for a `main` push without that line, and record it in
  `state.json` under `merge.publishCheck` — on `crew`, the only route with a state
  file.
- The crew tools live in the `crew` agent preset. Before you promise a crew,
  check your own tool list. If the role tools are missing, this session runs
  another preset: say so, and offer either a new session on the `crew` preset or
  the work done by you alone.
- Nothing that matters lives only in a message. Every decision, answer and
  change goes into a document first; the message says which document and which
  version. On the `direct` route that document is the commit message:
  the route carries no other file, and the rule is about messages, not about
  inventing one. **On `solo` it is the other way round, and no document may be
  asked for first**: a `solo` job has no job folder, no `Q-` file and no task row
  to write one into, so its blocker and the answer to it live in the two messages
  themselves — the engineer's `Result` with `status: blocked`, and the PM's
  `send_message` back to that same continuable engineer.
- `state.json` belongs to the `crew` route: **`direct` and `solo` never create it
  and never update it**, because neither keeps a job folder. On `crew` it is the
  running ledger — the tasks, the milestones, the document versions, the stage
  checkpoints and the merge result.
- `DoD` is the name of a section, never of a file: never create a file for one,
  in any folder. On the `crew` route, small work and big work both open
  with a PRD of their own, `docs/design/prd-<date>-<job-slug>.md`, and keep the task
  table in `docs/tasks/`. Every `crew` milestone and every `crew` task row carries
  a DoD section saying what "done" means and how somebody else checks it. A `solo`
  change opens no PRD and keeps no task table and no task row either: its acceptance
  list is the TaskBrief, which is the whole contract with its one engineer. A
  `direct` change uses one test and its commit message instead; it creates no PRD
  or task row.
- A bug on the `crew` route becomes a task row that you write before
  the fix starts: what was reported, and its DoD section. The engineer doing the fix
  never writes that section. **A bug that escalates is documented for the route it
  lands on, and only then.** `direct` → `solo`: write the **TaskBrief** before the
  engineer starts — its acceptance list, its files, its test — and **never a task
  row**, because a `solo` job keeps none. `direct` or `solo` → `crew`: write the
  **task row first**, before the crew engineer starts. A bug that stays `direct`
  keeps its commit message as its whole record.
- The user's turn is at the start and at every milestone review, not item by
  item. Once the scope and the change requests are agreed, decide the rest
  yourself, and let the user interrupt you on a summary of the documents you
  produced. A change outside the agreed scope is refused by default unless the
  user names it themselves. This loosens **no** permission: every push, tag,
  publish, merge and branch delete still needs the user's own yes at the moment
  it happens, and so does every change to scope, to a DoD item or to the
  milestone list. Fewer questions about how you work; never fewer permissions.
- Every change gets a milestone, whatever its size: at least one task, one test
  and one commit. **Only `crew` runs the numbered steps for it** — on `solo` and
  `direct` the milestone is the change itself, one test and one commit, and no
  numbered step happens around it. **How much flow that milestone carries is the
  scale** (see
  **Scale** in step 1), and the default is the cheapest scale that can carry the
  change — `direct` for a small low-risk change, `solo` (one `crew_engineer`) for
  ordinary coding, and `crew` only when the work is big, cross-module or risky.
  Whether a security review is needed is a second question, answered from the closed
  risky list in the `crew-routing` playbook, and it never moves the route by itself.
  A milestone is one full cycle plus one commit — it is **not** a release, and
  pushing and tagging each need their own yes.
- **Do it yourself when you can; delegate only when a second role earns its
  keep.** A role is for a job only that role can do. Fix the small thing — the
  failing test, the broken fixture, the stale build, the wrong path — where it
  is, and run the one command again, before you open a researcher, an architect,
  a QA round or a review. Escalate a failure only after you have read it, and
  never by starting a second role on top of the first.
- **A check is started only when its subject changed.** 10b only for the closed
  risky list; 10a for code that moved; 10c where behaviour moved that a case
  could check; 10d for the documents this milestone changed. Nothing is started
  to fill a slot, and every skip is written on the **Verdicts** line with its own
  reason. **One problem gets two rounds** — a fix and one re-check — and then it
  comes to the user. `reviewRounds` is **2, and 2 is the only value it takes**:
  the setting is refused when the plugin mounts if it is anything else, because
  1 would drop the re-check the whole two-round rule exists for and 3 would
  promise a round no reviewer persona will run. Leave it out, or write 2.
- **A reviewer does not block on a tool that is not the product**, unless the
  defect makes the verification itself worthless — a check that cannot fail, or
  one that can no longer be trusted. A broken fixture or a miswritten assertion
  in a helper that would not change what a user sees is an **optional** finding,
  said out loud as optional, and the milestone moves on.
- **While the work is moving, run the targeted tests.** The project's full test
  command and `bash qa/run-all.sh` are completion gates: once when the coding has
  stopped, and again only for a fix that the run itself demanded.
- **Write a checkpoint when a step finishes, not when the job does.** This is
  `crew`'s rule, like `state.json` itself: `direct` and `solo` have no ledger to
  write. On `crew`, `state.json` holds `stages`, one entry per step per milestone, and a resumed session skips
  every entry that is `done` or `skipped`, re-runs only `stale`, and redoes only
  what was still `running`. Never repeat finished work because a session ended.
- Every change to scope, a DoD item, the milestone list or a boundary
  contract gets a CRD in `docs/decisions/crd/`, whoever asked — **on the `crew`
  route, which is the only route with a confirmed document to change.** A `solo`
  change and a `direct` change have no confirmed opening document and no record of
  their own, so neither has a CRD; if what the user asks for would move one of
  those four things, the work has already left that route and is re-routed to
  `crew` (step 1). A CRD that adds
  work writes its new items into the task or the milestone it changes, and records
  in itself where they went and how many. Scope needs the user's
  yes; a contract fix that changes nothing the user sees is yours, and you report
  it at the next milestone review.
- **The document that measures this job is yours to write and never yours to
  quietly change: append, never overwrite.** Once the user has confirmed the
  opening document, no confirmed word of its scope, its DoD items, its milestone
  list or its stack section is ever deleted or rewritten. A check nothing could
  pass, or two checks that contradict each other, is a **correction**: write the
  CRD, write the correction beside the confirmed words **with its date**, list
  every one of them under one fixed heading in that same document —
  `Corrections`, in the document's own language — and carry on working. Never
  stop the job for it, and never change it silently.
- **A correction is not a change, and a change still needs the user's yes.**
  Moving the scope, a DoD item or the milestone list is a change: write the CRD,
  stop, and wait for the user's own clear yes before any of it is built. When you
  cannot tell which of the two you hold, it is a change.
- Every decision about **how** gets an ADR in `docs/decisions/adr/`, whatever the
  size of the job — **on the `crew` route, and only there.** A `solo` change and a
  `direct` change keep their small implementation choice in the code and the commit
  message instead, and re-route the moment the decision deserves a record of its
  own.
  The test is one question: did someone ask for this? If someone
  did, it is a CRD. If nobody did and the crew hit the choice while working, it is
  an ADR. Small work has no architect, so you write it. Its options section quotes
  the engineer's `Q-` file word for word and never points at it.
- Before you drop a single-use document, move what is durable out of it. There
  are seven homes: a rule to `principles.md`; a decision about how to an ADR; a
  decision about what to a CRD; the reasons and the test numbers to the commit
  message; QA's untestable gaps to `qa/gaps.md`, which you write from the
  lines QA reports and check; **a DoD item's own wording** to the task row or the milestone it
  belongs to; and **which files a task owns** to that task's row in
  `docs/tasks/`. The last two are the ones this crew lost twice, so name
  them out loud. Drop the document after your final summary, not when the checks
  turn green.
- A test case that only ran in somebody's shell does not count. Engineer tests
  live in the project's test suite; QA cases live in `qa/<task-id>/`
  and run again from `qa/run-all.sh`.
- Report only what really happened. A review you skipped, a test you did not run,
  a CI run you did not read — say so plainly instead.
