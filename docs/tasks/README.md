# docs/tasks —— 任务表目录

这是本仓库的任务表。**一个任务一个文件**：`docs/tasks/T-<n>.md`，顶部标题 `# T-<n> — <一句话>`。

- 每个任务文件内含该任务的 Verdicts 行、里程碑、形状、拥有的文件、DoD 表和正文。
- 新任务直接在这里新建 `T-<n>.md`（编号接续现存最大编号），不需要改任何其他文件。
- `tools/verify-tasks.mjs` 扫本目录：每个 `T-*.md` 必须有恰好一条 `- **Verdicts**` 行，
  且每个 `not run` / `skipped` 值带自己的理由。**目录为空会红**——门不接受"没东西验"。
- 本目录的前身是 `docs/design/tasks.md`（单一任务表），2026-08-23 迁移为目录结构，
  旧任务行未保留（git 历史可找回）。

## The canonical interview-rule paragraphs (English)

`skip-and-split` 作业把三段原文（A／B／C）钉在这里当契约：`roles/pm.md`、
`principles.md` 等文件逐字抄这一份。`qa/T-106/` 和 `qa/T-107/` 的用例
在运行时从本节的 `### <letter> (English)` 标题下读出英文原文再去找抄件。本节
2026-08-23 从 `docs/design/tasks.md` 的附录迁来（git 历史可找回原文）。改这三段
原文是改契约，按 `principles.md` 第 14 条走 CRD，并让抄件在同一个 commit 里跟上。

### A (English)

> **Judge every question for whether it can be skipped.** A question can be skipped
> **only when its answer changes neither what gets built nor what gets released** — being
> able to start the work without the answer is not enough on its own. For a question that
> can be skipped, offer a **"leave it undecided"** option beside your recommended answer.
> **A question that cannot be skipped gets no such option**, and you say in one line why
> it cannot.

### B (English)

> **A question the user left undecided is written nowhere in the opening document.** Not in
> the table of what the interview settled, not in "not in scope", not in "still undecided".
> Written into any of the three it becomes a confirmed line, and the user asking for that
> thing later becomes a change of scope. **A question the user answered goes into the table
> of what the interview settled, and a "no" is an answer.** Only "leave it undecided" leaves
> nothing behind; you may never drop a refusal the user actually gave. **"Still undecided"
> holds only the decisions you already know must be made at a known later point — never a
> question you asked and they skipped.**

### C (English)

> **"Not in scope" may only hold an item with a real cost**: crossing it means work already
> finished has to be built again, it cannot be undone (a package published, a tag pushed,
> data deleted), or it would weaken a safety guard or a permission rule. Something you simply
> did not do, where crossing it only means a little more work, **does not go in the list**.
> Put it there and it becomes a boundary the user has to overturn to get what they want.
