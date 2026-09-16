# Playbook: the job folder, its state file, and what to do after a restart

The ledger of a job that has a folder: `state.json`, the stage checkpoints, the `Q-` question files, and how a restarted session picks the job up.

**Read this when:** a job has a folder (`crew`, and `solo` once it starts an engineer), or an unfinished-job notice appears.

This file is not loaded into your prompt. Read it with `read` at the moment the
job needs it, and only then — the rules you must never break live in `roles/pm.md`,
which is always in front of you.

## While the crew is working

- **Standing by is not sitting idle.** Do not start unrelated work — new work
  nobody asked for is the only thing this forbids. The roles you started in one
  message are running right now, and your job is to answer every one of them.
- A child's `report` arrives as a message to you. Answer it by **updating the
  document**, not by a private reply, so every role sees the same truth. A
  message may point at a document; it may never be the document.
- If the report asks for something that changes scope, a DoD item, the
  milestone list or a boundary contract, it is a change request: write the CRD
  first (see **Change requests** above), then decide it or take it to the user.
- After any document change: raise its version in `state.json`, then
  `send_message` **every** live crew child — not only the one that asked. Say
  which document changed, which version it is now, and what to re-read.
- If the change breaks work that is running right now, call `interrupt_agent` on
  that child first, then send the message.
- A blocked child marks its own task blocked and moves to another task it owns.
  You unblock it by updating the document that blocks it — the opening document
  or its task row in `docs/tasks/` — and telling it the new version.
- If a child asks something the files can answer, answer from the files. If only
  the user can answer, ask the user at once.

## The state file

This is the ledger of a job that has a folder — `crew`, and `solo`'s one
engineer. A `direct` change has no state file and nothing to keep in one.

`~/.dsh/crew/jobs/<job-slug>/state.json`, English, keep it small:

```json
{
  "job": "add-sso-login",
  "repo": "/home/you/project",
  "branch": "crew/add-sso-login",
  "merge": { "into": "main", "merged": true, "pushed": true, "branchDeleted": false, "publishCheck": "<the CI files you read> -> <publishes | does not publish on a main push>" },
  "language": "English",
  "docs": { "prd": 3 },
  "milestones": [
    { "id": "M1", "goal": "one real SSO login works end to end", "state": "done" },
    { "id": "M2", "goal": "a failed login says why", "state": "running" },
    { "id": "M3", "goal": "an admin can revoke a session", "state": "todo" }
  ],
  "tasks": [
    { "id": "T-01", "milestone": "M1", "state": "done", "files": ["src/auth/token.ts"], "agent": "<agent id>" },
    { "id": "T-02", "milestone": "M2", "state": "review", "files": ["src/api/login.ts"], "agent": "<agent id>" },
    { "id": "T-03", "milestone": "M2", "state": "blocked", "files": ["src/ui/form.tsx"], "question": "Q-01" }
  ],
  "questions": [
    { "id": "Q-01", "from": "T-03", "text": "...", "answer": null }
  ],
  "crds": [
    { "id": "0001", "from": "user", "touches": ["prd"], "decision": "accepted", "applied": "prd 3" },
    { "id": "0002", "from": "T-04", "touches": ["api/web-auth"], "decision": null, "applied": null }
  ],
  "stages": [
    { "id": "M1.prd", "state": "done", "against": "prd 3" },
    { "id": "M1.tasks", "state": "done", "against": "tasks 1" },
    { "id": "M1.coding", "state": "done", "against": "tasks 1" },
    { "id": "M1.qa", "state": "done", "against": "prd 3, tasks 1" },
    { "id": "M1.codeReview", "state": "done", "against": "prd 3, tasks 1" },
    { "id": "M1.securityReview", "state": "skipped", "against": "no risky path touched" },
    { "id": "M1.docReview", "state": "todo", "against": null },
    { "id": "M1.release", "state": "todo", "against": null }
  ]
}
```

**`stages` is the reason a resumed session does not do the work twice.** One
entry per step of one milestone, and the states are `todo`, `running`, `done`,
`skipped` and `stale`. Write an entry the moment a step finishes, before you
start the next one — a checkpoint written at the end of the job records nothing.

`against` is what that step ran against: the document versions it read, in the
short form `prd 3, tasks 1`. It is what makes a checkpoint safe to trust.

- On a fresh session, read `stages` first and **skip every step whose entry is
  `done` or `skipped`**. Do not re-run a review, a QA round or a document
  because the session restarted: the session is not evidence, the entry is.
- Move an entry to `stale` only when something really invalidated it — a
  document it read was re-versioned, or its own fix changed what it judged. Only
  a `stale` entry is run again, and the new version goes into `against`.
- A step with no entry has not run. An entry that is `running` after a restart is
  the one thing you re-do: whatever that step was, it did not finish.
- `skipped` carries its reason in `against`, in one line, and the same reason
  appears on the **Verdicts** line. A skip is allowed; a silent skip is not.
- Keep `stages` for the milestone you are in. When the user calls the milestone
  done, its entries are history: leave them, they cost a few lines, and they stop
  a later session re-reading a finished milestone.

Task states: `todo`, `running`, `review`, `blocked`, `done`.

Leave the whole `merge` key out for a job that was never merged, and
`branchDeleted` stays `false` until the user says yes to the delete.

Write `publishCheck` from the CI files of THIS repository, in the session that
read them, and name every file you read. Never copy the shape above as an
answer. If the field is missing, or it names a file this repository does not
have, do the check again before you ask for the push of `main`.

After a restart, treat a `publishCheck` that is already in `state.json` as
unverified: read the CI files again in this session and write the line again
before you ask for the push of `main`.

Milestone states: `todo`, `running`, `review`, `done`. `review` means the tasks
are finished and the user has been asked but has not answered yet. Small work
has **one** milestone, so its `milestones` array holds one entry, not zero.

## After a restart

You do not have to go looking. When an unfinished job exists, a note headed
**"Unfinished crew work"** appears in your context, with the job name, its
folder, its branch and how many tasks were done.

When that note names a job in the folder this session is working in:

1. Tell the user about it before anything else, in two or three lines: the job,
   which milestone it is in, what is done, what is left, and which tasks are
   blocked. If a milestone was waiting for the user's review, ask that question
   again first — the job cannot move until it is answered.
2. Ask one question: carry on, or start clean. Wait for the answer. Never carry
   on without asking, and never throw the job away without asking.
3. If they carry on: read the job's `state.json` and its documents, run
   `list_agents` to see which crew children can still be woken, check `git
   status` and the branch, then **read `stages` and start at the first entry
   that is not `done` or `skipped`** — never at the top of the milestone. A
   review that already ran is not run again because a session ended; the whole
   of the checkpoint rule is in **The state file** above.
4. If they start clean: say plainly what will be dropped, and only then remove
   the job folder.

Ignore a job that belongs to another folder — mention it only if the user asks.
If the note says a state file could not be read, tell the user; never treat an
unreadable job as finished.
