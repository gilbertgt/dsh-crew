# Playbook: change requests (CRD) and decisions about how (ADR)

When a decision needs its own record, which of the two it is, what each file holds, and who decides it.

**Read this when:** the user asks for something that would move scope, a DoD item or a milestone list, or the work runs into a choice about how that deserves a record.

This file is not loaded into your prompt. Read it with `read` at the moment the
job needs it, and only then — the rules you must never break live in `roles/pm.md`,
which is always in front of you.

## Change requests: every one gets a CRD — on the `crew` and `solo` routes

A **change request** is anything that would change **what the user gets** or
**how two modules talk**, once that has been written down and confirmed:

- the goal in the opening document, the scope, the "not in scope" list, an item
  in a DoD section;
- the milestone list;
- the **Language and stack** section — the language, the package manager, the
  framework, the database, the test framework or the test command;
- a boundary contract in `docs/design/api/`.

**A `direct` change writes no CRD, because it has no opened document to change.**
Its whole record is the commit message (step 1). And the moment the user asks for
something that would move a confirmed scope, a DoD item or a milestone list, the
work has stopped being a `direct` change: re-route it (step 1) and write the CRD
on the route that has documents. The rest of this section is for `crew`, and for
the `solo` task row whose DoD section is the one document it can change.

It does not matter who asks: the user mid-job, a role in a report, or you
yourself. Every one becomes a file you write, before anything moves.

Not a change request: a question the files can answer (that is an inbox `Q-`
file), a review finding about code, a defect, an internal design change that
keeps the same behaviour and the same contract — an ADR, an HLD detail, splitting
one task into two. Those are a version bump on the document that owns them, with
no CRD. One exception: when the user overturns an ADR's recommended option at a
milestone review, that is a change request, even when nothing the user sees
changes. Work was already built on that option, so redoing it costs real work.

**A question the user left undecided in the interview is not a change
request.** It was written down nowhere — not in the table of what the
interview settled, not in "not in scope", not in "still undecided" — so asking
for that thing later overturns no confirmed line, and it needs no CRD. That
reason is the whole of the exemption, and it is narrow: if saying yes to it
would move the milestone list, an item in a DoD section, or the scope, then
**principle 14 still applies** and that part is a change request like any
other, written and decided before anything is built.

### Writing one

`docs/decisions/crd/NNNN-<short-name>.md`, numbered in order, in the user's language,
never deleted — a rejected CRD stays, so anyone can see later what was asked
for and refused:

- **Who asked** — the user, a role and its task id, or you.
- **What they want** — in their words, one short paragraph.
- **Why** — the reason given, or "no reason given".
- **What it touches** — every document and every task id it would change.
- **Cost** — what would have to be built again, and which milestone it lands in.
- **Decision** — `accepted` or `rejected`, who decided (the user or you), and
  the reason in one or two sentences.
- **DoD items added** — when the change adds work, which task or milestone you
  added items to, and how many: "4 items added to T-05's DoD". The items
  themselves go **into that task row or that milestone**, in
  `docs/tasks/` or the opening document. A CRD that keeps them inside
  itself leaves the task saying it is done while the new work is not, and
  "acceptance check 18-21" points into a flat table nobody keeps.
- **Applied** — the documents you changed and their new versions, once it is
  done.

### Deciding one

- **A contract fix that does not change what the user gets** is yours to decide.
  Write the CRD, accept or reject it, and if accepted send the architect to
  change the contract file — you never edit a contract yourself. Follow the
  additive habit: add a call, a field or an error rather than changing one that
  already works. Name the CRD in the next milestone report so the user sees it.
- **Anything that changes scope, a DoD item or the milestone list needs
  the user's yes.** Write the CRD, then stop and ask them: accept, reject, or
  change it. Raise no version and start no task until they answer. If it lands
  in a milestone that is already finished, say that plainly — it means work is
  built again.
- Either way, once it is accepted: change the documents, raise their versions in
  `state.json`, write the new versions into the CRD's **Applied** line, and
  `send_message` every live child what to re-read. If a child is building the
  thing that just changed, `interrupt_agent` first.
- Nothing gets built from a CRD that is still undecided.

## Decisions about how: every one gets an ADR — on the `solo` and `crew` routes

An **ADR** is a decision record: one file that says what was being decided, what
the choices were, which one was taken and why.

**A `direct` change writes no ADR, and nothing here may be read as asking it
for one.** On that route a small implementation choice — which of two equivalent
call shapes, which helper, which of the libraries the project already has —
stays where the change is: in the code, in the one comment that explains it, and
in the commit message. That is the whole record, and it is enough for a change
whose route was chosen because it needs no second reader.

**A decision that really does deserve a record is a different route, not a
different document.** When the choice is big enough that a stranger a year later
would need the options and the reason written down — a shape other code will be
built on, a rule the next job will follow, something a reviewer would have to
reconstruct — stop, say so in one line, and re-route the work to `solo`, or to
`crew` when it is big as well. There the ADR has a home, an owner and a row that
points at it. The same holds for a CRD: `direct` writes neither, and the moment
it would need one, it is not `direct` any more.

On `solo` and `crew`, a decision about **how** goes in an ADR at
`docs/decisions/adr/NNNN-<short-name>.md`, **whatever the size of the job**. A
decision about **what**, about the scope, or about a contract goes in a CRD, as
the section above says. Nothing else decides where it lands: not the size of the
job, and not who is in the room.

**The test is one question: did someone ask for this?**

- **Someone asked** — the user, QA, a review, a role's report. That is a
  **CRD**.
- **Nobody asked**, and the crew ran into a choice while doing the work. That is
  an **ADR**.

**Small work has no architect — and a `solo` change has none at all — so you
write the ADR yourself.** Step 8 is skipped
for small work, and one small fix does not earn an architect. An ADR does not need
an architect to exist; it needs a decision to exist. For big work you may start a
`crew_architect` to write it instead.

### Where an ADR's options come from

- The **options** section **quotes the engineer's
  `<job folder>/inbox/Q-<number>.md` file word for word.** Do not rewrite it, do
  not shorten it, do not tidy it up.
- You add only two things: **the decision** and **the reason**.
- That is the point of the rule. The options are then not the words of the person
  who decided them, and because they are a quotation you cannot quietly reshape
  them into a case for the decision you already made. The engineer is closest to
  the code and is not the one deciding, so its list is the honest one.

### An ADR quotes, it never points

The `Q-` file lives in the job folder, outside the repository, and that folder is
dropped when the job ends. **`Q-` files are single-use**, like QA's test plans
and the output of a test run.

So an ADR may **never** say "options: see Q-03". A pointer at a file that is
about to disappear deletes the most valuable section of the ADR. Copy the text
into the ADR, and a reader still has it a year later.

**A `Q-` file's answer is durable whenever it changed a rule or a document.** It
has to move out of the job folder before that folder goes — see step 18.
