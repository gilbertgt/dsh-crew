# Playbook: the documents a crew job writes

The write set by document class, the channel rule, the two rules every role prompt copies word for word, the opening document (PRD), the task table and its rows, a bug's row, and how a single-use document is dropped.

**Read this when:** the route is `crew`, or a `solo` job writes the one task row its engineer reads.

This file is not loaded into your prompt. Read it with `read` at the moment the
job needs it, and only then — the rules you must never break live in `roles/pm.md`,
which is always in front of you.

## Documents are the only channel

You and the crew talk **through documents**. A message only says "go and read
this file". The document holds what was decided. A `direct` change starts no
child, so there is no message to answer and no document to keep: the commit
message is its record (step 1). On `solo` the documents are the one task row, the
ADR or CRD a decision earns (see **Decisions about how** below), and the
engineer's `Q-` file — which is the question, not the answer.

dsh gives every child a `report` tool and you have `send_message`, so messages do
exist — but nothing that matters may live only inside one. A role's report points
at the file it wrote. Your answer points at the file you changed and its new
version. Written this way, every role sees the same truth, and a role started
tomorrow reads the same thing as one started an hour ago.

- **A child reports.** It names the file it wrote or the question file it left
  (`<job folder>/inbox/Q-<number>.md`). You read the file.
- **You answer by changing a document** — the PRD, the task table, the design, an ADR, a
  boundary contract, or a CRD (a change request document; see the next
  section) — then raise that document's version in
  `state.json`, then `send_message` **every** live child: which document changed,
  which version it is now, and what to re-read. Never a private answer that only
  one role can see.
- **Never decide anything in a message.** If your reply contains a new rule, a
  new number, a new file name or a new promise, it belongs in a document first.
  Put it there, then send the pointer.
- The same holds for the user. What the user decides goes into a document before
  the crew hears about it.

## What you may write

**Your own write set.** By class, never by file name — the opening document's name carries the job
it belongs to, so it changes with every job, and a list of names would be wrong by the next job:

- the **opening document** of a job, and nobody else writes it;
- every **change request** document, whoever asked for the change;
- the **Verdicts** line on every task row, whoever wrote the rest of the row;
- the **shared QA runner** and the **standing gap list** under the QA folder. QA reports the lines
  and you write them: two QA roles running side by side would both write those two files, the second
  write would win, and a runner that lost one task's cases still prints a green total;
- the **project's own rules file** and the file holding this crew's principles. A role editing those
  is changing the rules it is working under, which no task row can authorise;
- on small work, which has no architect: the **task rows** and their DoD sections, the **design**,
  and the **ADRs**;
- what the **reader-facing files** say — the two READMEs and the changelog. An engineer may write
  them under a task row with its own DoD section: they judge nobody and they are not the project's
  rules, so they are ordinary job output;
- the job's **state file**, which lives outside the repository;
- every **git** action. No crew role ever commits, pushes or publishes.

**Reading is not restricted, and you should read widely.**

The full table of who writes what, by class, is in the crew's principles file under
`Who writes which document`. The same table, short:

| Class of document | Who writes it |
| --- | --- |
| The opening document of a job (a PRD, one per job) | the PM, and nobody else |
| The design (an HLD, one per job) | the architect; the PM on small work, which has no architect |
| The task table's rows, and the DoD section on each row | the architect; the PM on small work, and the PM for a bug's row |
| The **Verdicts** line on a task row | the PM, always, whoever wrote the rest of the row |
| A decision about how (an ADR) | the architect; the PM on small work and for a bug's ADR |
| A change request (a CRD) | the PM, whoever asked for the change |
| An interface contract, and the interface ADR of a paired task | the architect **only** — no engineer edits one, on either side |
| QA's cases and the `run.sh` beside them | `crew_qa`, and only inside its own task's folder |
| The shared QA runner and the standing gap list | the PM. QA reports the lines to add and never writes either file |
| Product code and its unit tests | the engineer that owns that task |
| The reader-facing files: the two READMEs and `CHANGELOG.md` | the PM decides what they say; an engineer may write them under a task row with its own DoD section |
| The project's own rules file, and the crew's principles file | the PM, and nobody else |

**Never put one of the judging documents in a role's file list.** The opening document, a task row's
DoD items, the milestone list: a role handed one of those is the party being judged rewriting the
test, however right the new wording is and however small the edit. A role that declines such a
briefing and reports it back to you **is right to**, and the answer is to correct the file list, not
the role.


**Your own half is stricter, because you are the one who writes them.** Once the user has confirmed
the opening document, no word of its scope, its checks, its milestone list or its stack section
changes without the user — **and a correction is not an exception.** A check that is impossible, or
contradicts another check, or asks for something the job has since decided against, is a finding,
not a licence.

So the shape is **append, never overwrite**:

- the confirmed words stay, exactly as the user read them;
- a **CRD** records the correction, and its **Applied** line names the document and its new version;
- the correction goes **beside** them, with its date and whether it is an addition or a correction;
- the work does not stop;
- the document carries a **fixed heading** listing every one of them, so the user can read the whole
  set at a glance and interrupt you if they disagree.

Two things stay yours with no ceremony, because they change nothing the user agreed to: raising a
version number in the state file, and writing the **Applied** line of a change the user has already
accepted.

A standard you may quietly correct is not a standard. A standard whose corrections are all visible
still is.
