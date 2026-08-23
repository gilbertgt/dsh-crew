# PRD：QA 目录从 docs/qa/ 迁到 qa/，删 docs/qa/

- **日期**：2026-08-23
- **版本**：1
- **作业 slug**：`qa-dir-move`
- **车道**：团队（team），一个里程碑

## 目标

用户把 `docs/qa/` 复制到根 `qa/`（内容一致，各 40 个任务目录），要**让全部测试在 `qa/` 下跑绿**，
并**删除 `docs/qa/`**。这是把 QA 案例目录从"文档家族"（docs/qa）提升为仓库一等目录（qa）。

## 为什么（用户决定）

- QA 案例是**可运行的代码**（case-*.mjs + run.sh），不是文档——放在 `docs/` 下是历史安排。
- 迁到根 `qa/` 让它成为一等目录，语义更对。
- 用户已复制并明确要求：修引用 + 删 docs/qa。
- **CLAUDE.md 已加规则文字**："Everything QA puts in the repository goes under `qa/` — ... QA
  cases are scripts, not documents, so they do not live under `docs/`"。本作业的执行就是让仓库
  事实与这条规则一致（其余 CLAUDE.md 里的 `docs/qa/` 路径提及属于第 2 步批量迁移）。

## 已核实的事实（2026-08-23）

- `qa/` 与 `docs/qa/` 结构一致（各 40 个任务目录，case/run.sh/lib/gaps.md/README.md/rule-guard-map.md 都在）。
- **246 个文件引用 `docs/qa`**：package.json、.github/workflows/test.yml + publish.yml、tools/verify-*.mjs、
  host/、roles/、CLAUDE.md、principles.md、README 对、docs/、qa/ 内部。
- **核心陷阱**：`qa/lib/qa.mjs` 的 `REPO` 常量是 `resolve(..., "..", "..", "..")`（从
  `<repo>/docs/qa/lib` 上 3 层到 repo 根）。移到 `<repo>/qa/lib` 后上 3 层**指向仓库外**——
  必须改成上 2 层。同理 tempRepo() 的拷贝清单、run-all.sh 的 find 起点等所有相对路径。
- `docs/qa/run-all.sh` 用 `find "$here" -mindepth 2 -maxdepth 2 -name run.sh`（$here=脚本所在目录，
  移动后自动跟随 qa/run-all.sh，无需改 find 本身）。

## 必须做什么

### 第 1 步：迁移 qa/ 内部的自引用

- `qa/lib/qa.mjs`：`REPO` 从 `..","..",".."` 改 `..",".."`；`tempRepo()` 拷贝清单里
  `docs/qa` 相关路径改 `qa`；注释同步。
- `qa/run-all.sh`、`qa/gaps.md`、`qa/README.md`、`qa/rule-guard-map.md` 内部对 `docs/qa/` 的
  引用改 `qa/`。
- **验证**：`bash qa/run-all.sh` 里不依赖 repo 外部引用的部分先绿（或至少不崩在 REPO 层数）。

### 第 2 步：修 246 处外部引用

- `package.json`：`scripts.test` 里 `bash docs/qa/run-all.sh` → `bash qa/run-all.sh`。
- `.github/workflows/test.yml`：`Check markdown links` 步骤若引用 docs/qa 则改。
- `tools/verify-*.mjs`：verify-tasks/mount/pm-write-guard/rule-guard-map/links/jobs 里
  `docs/qa` → `qa`（含 pin 期望字符串、读文件路径、tempRepo 注释）。
- `host/`、`roles/*.md`、`CLAUDE.md`、`principles.md`、README 对、docs/ 下的 PRD/HLD/ADR/CRD 提及。
- **注意**：verify-mount 可能有 pin 要求角色提示含 `docs/qa` 字符串（同 split-tasks 的 tasks.md pin）——
  改角色提示 + 改 pin 同步。
- **验证**：`npm test` 逐步转绿。

### 第 3 步：删 docs/qa/

- 删 `docs/qa/` 整个目录。
- **验证**：`grep -r "docs/qa" .` 为 0（除 git 历史/CHANGELOG 提及）；`npm test` 全绿。

## 不在范围

- 不改任何 case 的**断言语义**——只改路径。
- 不重排/重命名 case 文件本身（T-<n>/case-* 结构不变）。
- 不合并 qa/ 与 docs/qa/（docs/qa 直接删，qa 是唯一家）。

## 语言和栈

- 中文文档（gaps.md 等保持中文）；代码英文。
- 测试命令：`npm test`（含 `bash qa/run-all.sh`）。
- 不新增依赖。

## 发布准则

| 项 | 判定 |
| --- | --- |
| 第 1 步 | `bash qa/run-all.sh` 能跑（不崩在 REPO 层数）；qa/lib REPO 指向 repo 根 |
| 第 2 步 | `grep -r "docs/qa" package.json .github/ tools/ host/ roles/ CLAUDE.md principles.md README.md README-zh.md` 为 0（除历史提及）；`npm test` 绿 |
| 第 3 步 | `docs/qa/` 不存在；`grep -r "docs/qa" .` 为 0（除 git 历史/CHANGELOG 提及）；`npm test` 全绿 |
| 验收 | `npm test` 全绿，QA 套件从 `qa/` 跑 |

## 排期

一个里程碑，三步按顺序走（每步一个任务或一组，各自带 DoD）。246 处引用是批量路径迁移，
按文件类别拆并行任务（同 split-tasks 的教训：一个任务一个 code change）。不发布 npm 版本。
