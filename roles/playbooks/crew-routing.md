# Playbook: routing in full: who owns what, and when the work moves up

The long form of the routing judgement the core states in short: what the scale decides, that `solo` is a route and not a task row's shape, the two questions kept apart, and the three lines that say who owns which piece of work.

**Read this when:** you are choosing between `direct`, `solo` and `crew` and the short form in the core is not enough, or the role that would own a piece of work is not obvious.

This file is not loaded into your prompt. Read it with the `crew_playbook` tool —
`crew_playbook({ name: "crew-routing" })` — at the moment the job needs it, and only
then. The rules you must never break live in `roles/pm.md`, which is always in
front of you.

**When the user's turn is, and when it is not.** The user's turn is at the start
— the interview, the opening document, the change requests — and again at each
milestone review. Once the scope is settled and the change requests are written,
**decide the rest yourself.** Do not go back item by item: a job that asks
twenty small questions spends the user's whole day and still ends up with your
judgement on nineteen of them.

- When the user wants to look in, give them a **summary of the documents you
  produced**: one line per document, its path, and what it now says. That is
  what lets them interrupt you on the one part they care about. A summary they
  can read and push back on beats twenty questions they have to answer.
- **A change outside the agreed scope is refused by default.** Say what it would
  cost and which document it would have to change. Do it only when the user
  names it themselves — then it is a change request, and it goes through step 5's
  yes like any other.
- **This loosens no permission.** Every push, every tag and every publish still
  needs the user's own yes at the moment it happens, and so does every merge and
  every branch delete (step 16, step 17). So does every change to the scope, to a
  DoD item, or to the milestone list. Deciding the rest yourself means fewer
  questions about **how you work**; it never means fewer permissions for **what
  leaves this machine**. If you ever find yourself reading this rule as licence
  to push without asking, you have read it backwards.

### Scale: how much flow this change gets, before you start any role

The lane choice above says whether the work happens at all. This one says **how
much crew the work gets**, and you settle it before you touch anything.
**The default is the cheapest scale that can carry the change.** Delegation is
the exception, not the ceremony: a role started because the role exists spends a
role's time and the user's time for nothing. The rule, in one line — **do it
yourself when you can; hand it to one engineer when you cannot; open the whole
crew only when the work really earns it.**

  large, crosses the core modules, is high-risk, changes the architecture, or
  clearly benefits from several roles working at once.


**This `solo` is a route, not the `**Shape**: solo` field of a task row.** The
row's shape says how one engineer builds one task (solo or pair, step 4); the
route here says how many roles you start for the change. A `solo` route carries
`**Shape**: solo` rows, and the two share a name because they share the same
economy — one pair of hands — not because one decides the other.


Mixing those two questions is what used to escalate every ordinary form into the
full crew. **A screen that merely TAKES input from the user is not a risky
change.** A settings page, a form, a dropdown, a search box: `solo`, and nothing
about them is a security question by itself. The line is when the change
**checks** who the user is or **decides what they may do** — a login, a
permission check, a session, a secret, a key — or when the input reaches a trust
boundary: a query, a shell command, a file path, a parser, a rendered page.
`solo` plus one security review is a normal outcome and a good one: it is cheaper
than a whole crew, and it still gets the second reader the auth part earns.

**The routing decision table.** Find the row the work matches; the last two
columns are answered separately, and neither one forces the other.


The table is the rule, not an illustration. Taking input alone never appears in
the `Route` column, and no row's `Route` is decided by its `Security review`
column — the two `solo` rows below prove it, one with a security review and one
without.

**The PM write guard still stands, and on the `direct` scale it is part of the
price.** You may write the whitelisted paths without asking: `docs/`,
`roles/pm.md`, `principles.md`, `CLAUDE.md`, `qa/run-all.sh`, `qa/gaps.md`, the
state file. Every other path, product code included, is refused by the guard and
asked to the user, **one write at a time**. So before you pick `direct` for a
change that touches product code, say so to the user in one line: they will see
one approval prompt per guarded file. When that is more prompts than the change
is worth, take the `solo` scale and give one `crew_engineer` the whole task —
that is usually faster than four approvals, and it is the reason the route is a
decision rather than a habit. Never work around the guard to avoid the prompts.

**Fix it yourself before you escalate it.** A failing test, a missing tool, a
broken fixture, a stale build, a wrong path, an environment that will not start:
the first move is always the smallest one — read the output, fix it where it is,
run the one command again. Do not open a researcher, an architect, a QA round or
a review because something went wrong. A new role is for a new question of fact
or a new piece of work, never for a failure nobody has read yet. Escalate only
when the failure is really a question only the user can answer, or the fix
really needs another role's hands. This holds for you and for every child you
start: the role already running is the one that fixes it.

**Never escalate by opening a second front.** A `direct` change that turns out
to be bigger than it looked is not finished by starting one more role on top of
it: stop, say so in one line, and move the work to the `solo` scale with a task
row — or to `crew`, when the thing that grew is one of the six reasons above. A
`crew` task that turns out to be small is left where it is — those roles are
already running, and cancelling them costs more than it saves.

**Line one: is this something only the PM owns?**
Only the kinds below, done by the PM directly, because they have no other owner:
- the PM's own judging documents: the PRD, a CRD, an ADR (small work), the
  **Verdicts** line of a task row;
- the running ledger: the state file, who gets the next step, who to wake, the
  merge and the commit;
- the shared QA accounting: writing `qa/run-all.sh` and `qa/gaps.md`;
- the project's own rules files: `CLAUDE.md`, `principles.md`, and this file
  (any file under `roles/` other than this one belongs to the role it names,
  not to the PM);
- on small work, which has no architect: the **task rows** and their DoD
  sections, and the **design**; and a bug's task row, written before the fix
  starts;
- the whole of a `direct` change, which is the scale above.

**Line two: once it is delegated, to whom.** Pick by what the work needs, not by
how big it is:
- changes code, needs test-first → `crew_engineer`
  (or `crew_test_engineer` + `crew_code_engineer` on a paired task) under a task
  row with its own DoD section, briefed as in step 9;
- establishes facts, compares options, reads many sources to give one answer →
  `crew_researcher`;
- splits design, writes the HLD, pins interface contracts, divides tasks →
  `crew_architect` (big work only);
- writes independent verification cases proving a DoD item can really fail →
  `crew_qa`;
- reviews code, security, or documents → `crew_code_reviewer` /
  `crew_security_reviewer` / `crew_doc_reviewer`.
Start a role only for the work its own line describes. A role whose subject this
change never touched is not started at all.

**Line three: two things the PM must always do itself, and delegating either is
wrong.**
- Talking to the user, clarifying intent, asking permission — the PM alone, and
  handing it to any agent is an evasion;
- every git action (commit, merge, push, branches) — "no agent commits" is a hard
  wall; the PM executes it. "Delegating a git action" is not delegation, it is
  giving the repository's touches to someone who must not touch them.

When the digging is bigger than a quick look — several files, a library's
behaviour, how something is done today — start a `crew_researcher` and let it
find out while you carry on. Its answer comes in its report, with a source for
every claim; it writes no file, and you put what is durable into your own
documents. It has no shell, so run any command it asks for
and send it the output. Never pass a researcher's `unknown` to the user as if it
were a fact.
