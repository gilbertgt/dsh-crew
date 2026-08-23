# PRD：PM 写文件 guard —— 运行时拦住 PM 自己改"不该 PM 改"的文件

- **日期**：2026-08-23
- **版本**：1
- **作业 slug**：`pm-write-guard`
- **车道**：团队（team）

## 目标（problem，不是 solution）

事实：规则文本管不住 PM。`roles/pm.md` 明文写"没有 PM 自己改文件的车道"，但 PM（比如
本仓库自己的会话）**反复违反**——T-92、T-111 两次抓到"PM 直接改文件、事后补任务行"，这次
用户又点了两次。git-guard 注释那句是准确的："prose is advice, while a `tools/execute`
wrapper is the place a call is actually stopped."

所以本 PRD 要做的是一个**结构性 guard**：像 git-guard 拦 push 一样，在运行时拦住 PM 对自己
无权改的文件执行 write/edit。不新增任何规则文本——那已经被证明无效。它让"PM 不能偷偷改
文件"变成不可能，而不是靠 PM 自觉。

## 必须做什么

- **G1（判定）**：PM(root 会话) 对文件的 write/edit 调用，按路径归类为"PM 专属"或"该由 crew
  role 写"。PM 专属的白名单路径允许写；其余受保护路径默认拦。
- **G2（实现）**：host 平面 `tools/execute` 中间件（跟 git-guard 同一条挂载路径），拦
  write/edit 工具。不走"再写规则"。
- **G3（放行）**：guard 拦到一个受保护路径时，**走 dsh 的批准通道向用户发起批准请求**（GUI
  里用户点"批准"），不静默拒绝。用户批准 → 放行这一次；拒绝/忽略 → 拦下。每次单独问。
- **G4（范围）**：只拦 PM(root)。crew role 写它自己任务拥有的文件不受影响——它们本来就有权。
- **G5（单测）**：受保护路径白名单要能单测，像 git-guard 的 `verify-guard.mjs` 那样对 fake
  命令断言"这个拦了、那个放行"。

## 边界与实现要点（对齐已确认的决策）

| 决策 | 确认 |
| --- | --- |
| 判定依据 | **受保护路径白名单**（PM 可写的路径硬编码 + 单测），不读 tasks.md 动态解析 |
| 放行机制 | **dsh 批准通道**（用户点批准），不用 git-guard 那种"一次性 touch 文件" |
| 行为 | 默认拦；用户批准放行一次；每次单独问, before ask user to approve, pm should consider whether he should write a prd to change it |
| 范围 | 只拦 PM(root)，不碰 crew role |

**PM 可写的白名单**（按 `roles/pm.md` `## What you may write` 的类别映射到路径）：
- `docs/design/prd-<date>-<slug>.md`（opening document）
- `docs/decisions/crd/*.md`、`docs/decisions/adr/*.md`（CRD/ADR）
- `docs/design/tasks.md` 的 **Verdicts 行**（PM 写；但整个文件被工程任务共同拥有——实现时
  需按"只放行 Verdicts 行"还是"放行整个文件"细分，见附记 A）
- `docs/qa/run-all.sh`、`docs/qa/gaps.md`（共享 QA 记账，PM 写）
- `CLAUDE.md`、`principles.md`、`roles/pm.md`（项目规则文件，PM 独有）
- job 的 `state.json`（在仓库外，`~/.dsh/crew/jobs/...`）

**受保护（默认拦，PM 违例写这些就是被拦的用例）**：
- 产品代码（`src/`、`host/`、`tools/*.mjs` 等）
- 各 role 的规则文件（`roles/engineer.md`、`roles/qa.md`、`roles/architect.md` 等非 pm.md）
- 接口契约 `docs/design/api/*.md`（architect 专属）
- QA 案例 `docs/qa/T-*/case-*.mjs` 和它们的 `run.sh`（crew_qa 专属）
- 引擎单元测试等

## 附记 A：tasks.md 的 Verdicts 行如何放行

`roles/pm.md` 说 Verdicts 行只有 PM 写。但 `docs/design/tasks.md` 本身被多个角色共同维护。
本 PRD 暂定：guard 把 `docs/design/tasks.md` 整体视为"PM 可写"（因为 PM 既写 Verdicts 也写
小任务行），否则实现太复杂（要解析 markdown 区分行）。这个粗粒度放行不是完美，但符合
"guard 别误伤正常流程"的原则；若以后谁发现 PM 不该无限制写 tasks.md，再细化为仅 Verdicts 行。

## 不在范围

- 不新增规则文本到 `roles/pm.md`——本 PRD 的目标恰恰是不靠规则。
- 不动 agent-teams（用户已定不要）。
- 不改成"读 tasks.md 动态归类文件"的复杂版本——用确定性白名单。
- 不改 git-guard 已有的 push 拦截行为。

## 语言和栈

- 语言：英文（代码/文档/提交英文）。
- 改动的文件：新增一个 host 插件（如 `host/pm-write-guard.js`），挂到 `cordis.patch.yml`；
  加对应的单测（如 `tools/verify-pm-write-guard.mjs` 或并入 verify-*）；可能动 `cordis.patch.yml`。
- 测试命令：`npm test`。

## 发布准则

| 项 | 判定 |
| --- | --- |
| 结构 | 新增插件经 `cordis.patch.yml` 挂载，PM 的 write/edit 被它拦截（真实测试：PM 尝试写受保护路径被拦） |
| 判定 | 白名单路径放行、受保护路径拦——单测覆盖 |
| 放行 | 用户批准后放行一次；每次单独问 |
| 不误伤 | crew role 写自己任务文件不被拦（单测覆盖） |
| 验收 | `npm test` 全绿 |

## 排期

一个新插件任务（T-113），今天的正常作业。落地后 dsh 需重启才生效（同 gate-guard 那样）。
