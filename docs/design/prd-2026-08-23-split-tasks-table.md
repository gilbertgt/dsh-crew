# PRD：任务表迁移——删 tasks.md，新任务直接进 docs/tasks/*.md

- **日期**：2026-08-23
- **版本**：2
- **作业 slug**：`split-tasks-table`
- **车道**：团队（team），一个里程碑

## 目标

现在整个仓库的任务表是 `docs/design/tasks.md`（2544 行单文件，63 个 task section）。本作业：

1. **删掉 `docs/design/tasks.md`**——不拆、不保留现有任务行（用户决定：no need to preserve）。
2. **新建 `docs/tasks/` 目录**——未来的新任务直接写成 `docs/tasks/T-<n>.md`（一任务一文件）。
3. **verify-tasks 改扫 `docs/tasks/` 目录**——空目录即红（保持"空 = 红"哲学，防 vacuous green）。
4. **所有引用**（QA case、角色提示、verify-mount pin、pm-write-guard 白名单、rule-guard-map 来源）从 `docs/design/tasks.md` 改成 `docs/tasks/`。

**后果（用户知情并接受）**：现有 63 个任务行（T-63~T-125）的记录随 tasks.md 一起消失于工作副本（git 历史仍可找回）。`docs/tasks/` 不会为空——本作业自己的任务行（T-121~T-125）就是它的第一批内容，verify-tasks 扫目录始终有东西验。

## 为什么（用户决定）

- 任务表作为单一 2544 行文件已经难用：一次动一个 section 却面对整堵墙。
- 现有历史任务行不值得逐一拆保留——它们已随各自的作业完成，记录在 git 历史里。
- 新任务的归属 = `docs/tasks/T-<n>.md` 文件本身，一任务一文件，清晰。
- verify-tasks 从"读单文件"变成"扫目录"，引用只 pin `docs/tasks/` 目录和 task id，不再 pin 单文件路径。

## 顺序（每步可回退、可验证）

### 第 1 步：建 `docs/tasks/`，本作业任务行直接写进去，改 verify-tasks 扫目录

- 新建 `docs/tasks/` 目录。**本作业自己的任务行（T-121~T-125）直接写成
  `docs/tasks/T-121.md`~`docs/tasks/T-125.md`**——这是"新任务直接进 docs/tasks/*.md"的
  第一次实践，本作业就是第一个用户。**不迁移任何现有 section**。
- `tools/verify-tasks.mjs` 从 `readFileSync("docs/design/tasks.md")` 改成扫 `docs/tasks/*.md`：
  - 每个 `docs/tasks/T-<n>.md` 的顶部标题 `# T-<n> — ...` 是一个 task section，验证其 Verdicts 行；
  - **目录为空 → 红**（fail，防 vacuous green）。但本作业一建目录就有 T-121~T-125，**不会为空**。
- 需要一个说明文件 `docs/tasks/README.md`（非任务内容，简短：这是任务表目录，一任务一文件，Verdicts 怎么读的指针）。
- **验证**：`node tools/verify-tasks.mjs` 对 `docs/tasks/` 绿（读到 T-121~T-125 共 5 个 section）。

### 第 2 步：修引用——QA case、角色提示、文档

- 24 个 QA case + 9 个角色提示 + `docs/qa/lib/qa.mjs` 里对 `docs/design/tasks.md` 的引用
  改成 `docs/tasks/`（目录）或 `docs/tasks/T-<n>.md`。**T-42 的 tempRepo 拷贝清单要加 `docs/tasks/`**。
- **验证**：`grep -r "docs/design/tasks.md" docs/qa/ roles/` 为 0；改过的 case 单跑绿。

### 第 3 步：删 `docs/design/tasks.md`

- 删旧文件。
- **验证**：`ls docs/design/tasks.md` 报不存在。

### 第 4 步：扫尾——verify-mount pin、pm-write-guard 白名单、rule-guard-map 来源

- `tools/verify-mount.mjs` 要求角色提示含 `docs/design/tasks.md` 的 pin（line ~1212-1215、~1572、~1587）→ 改成要求 `docs/tasks/`。
- `host/pm-write-guard.js` 白名单 `docs/design/tasks.md` → `docs/tasks/`（目录，PM 可写）。
- `tools/verify-rule-guard-map.mjs` 的 DoD 来源 `### docs/design/tasks.md (DoD)` → `docs/tasks/README.md (DoD)` 或新位置。
- 同步 `tools/verify-pm-write-guard.mjs` 白名单断言。
- **验证**：`node tools/verify-mount.mjs`、`verify-pm-write-guard.mjs`、`verify-rule-guard-map.mjs` 各自绿。

### 第 5 步：收尾验证

- 本作业任务行已在 `docs/tasks/`（第 1 步建的 T-121~T-125），verify-tasks 有东西验，无需样例任务。
- 最后：`grep -r "docs/design/tasks.md" .` 为 0（除历史文档/PRD 提及）；`npm test` 全绿。

## 不在范围

- 不拆/不保留现有 63 个任务行（用户决定删除）。
- 不找回 T-01~T-62 的历史任务行。
- 不改任务内容本身（现有任务行随 tasks.md 一起删，不逐字迁移）。

## 语言和栈

- 语言：中文（tasks.md 现内容为中文；新 README.md 用中文）。
- 测试命令：`npm test`（verify-tasks 扫 `docs/tasks/`，目录有本作业任务行故绿）。
- 不新增依赖。

## 发布准则

| 项 | 判定 |
| --- | --- |
| 第 1 步 | `docs/tasks/` 存在；verify-tasks 扫目录且空目录红 |
| 第 2 步 | `grep -r "docs/design/tasks.md" docs/qa/ roles/` 为 0；改过的 case 绿 |
| 第 3 步 | `docs/design/tasks.md` 不存在 |
| 第 4 步 | verify-mount / pm-write-guard / rule-guard-map 各自绿，都指 `docs/tasks/` |
| 第 5 步 | `grep -r "docs/design/tasks.md" tools/ host/ roles/ docs/qa/` 为 0（除历史提及）；`npm test` 全绿 |

## 排期

一个里程碑，五步按顺序走（每步一个 task，各自带 DoD）。落地后 review 一轮。不发布 npm 版本。
