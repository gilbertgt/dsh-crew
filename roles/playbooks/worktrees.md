# Playbook: the paired shape and its two worktrees

How a paired task is run: two engineers, two git worktrees, one interface pinned by the architect, and the single first meeting the PM runs.

**Read this when:** a task is on the paired shape in a job that has an architect.

This file is not loaded into your prompt. Read it with `read` at the moment the
job needs it, and only then — the rules you must never break live in `roles/pm.md`,
which is always in front of you.

## The paired shape

A task may be run in the **paired shape**: `crew_test_engineer` writes only the
unit test files, `crew_code_engineer` writes only the product code, and the two
never meet. It is a second road, not a replacement — the solo `crew_engineer`
stays the default, and the flow of it lives in `roles/playbooks/crew-flow.md`,
step 9. Four things about it are decided before either half writes a line, and
the PM owns all four:

- **It exists only in a job that has an architect.** Before either half starts,
  both have to land on the same import path, exported name, signature, shape of
  the return value and behaviour on an error. The architect pins those five in
  an ADR, and only the architect may change it.
- **The PM makes two git worktrees, one per half, and adds the node_modules
  symlink in each one.** The unit test file does not exist in the code
  engineer's tree, and that is isolation, not good faith.
- **The PM runs the first meeting, in the merged tree, exactly once.** Neither
  engineer runs it: the code engineer cannot, and running it repeatedly would
  turn every disagreement into "my code was wrong" and never report the
  ambiguous document that caused it.
- **A green first meeting means one thing: the two readings matched.** It is
  not evidence that the document was clear.

