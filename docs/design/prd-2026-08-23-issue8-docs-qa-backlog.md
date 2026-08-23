# PRD：执行 issue #8 —— docs 与 QA backlog（真实成立的部分）

- **日期**：2026-08-23
- **版本**：2
- **作业 slug**：`issue8-docs-qa-backlog`
- **车道**：团队（team），一个里程碑

## 目标

`issue #8` 开了一个 docs/QA backlog。本作业**只做核查后真实成立的部分**，不做名不副实的
部分。核心诚实约束：**这个仓库没有 public API**，一切文档都要如实反映仓库现状，不发明
仓库里没有的接口或行为。

## 为什么要先核查（本作业的由来）

issue #8 提出时假设「本地已有未提交草稿」，还断言「T-108 case-03 红」。核查 `main` 现状：
- **已核实没有未提交草稿**，工作树干净；
- **T-108 case-03 现在绿**（13/13 通过），issue 那句描述已过时，不修；
- **没有 public API**——`package.json` `exports` 只有 6 个 dsh 插件入口（host/crew.js、
  roles-preset.js、git-guard.js、pm-write-guard.js、jobs.js、package.json），每个都是
  Cordis 插件模块（`name`/`inject`/`apply(ctx, config)`），不是用户可调用 API。

所以 **不创建** `docs/reference/api.md`、`docs/reference/config.md`，也不建 `docs/reference/`
目录——那会是假文档。本作业只做真实缺失的文档 + QA 保障。

## 必须做什么（一个里程碑，全部产物）

| # | 产物 | 说明 |
| --- | --- | --- |
| D1 | `README.md` 加 **Quick start**（英文） | 第一手用户 5 分钟上手：装（dsh plugin add）、跑（进入会话当助理）。内容从 README 现有 Install/Configuration 提炼，不引入新事实 |
| D2 | `README-zh.md` 镜像 Quick start（中文） | 与 D1 同 commit、同内容逐字对应 |
| D3 | `CONTRIBUTING.md` | 贡献指南：改代码/文档/QA 怎么走（任务行、review 轮次、npm test）；来自 CLAUDE.md 的运作事实 |
| D4 | `SECURITY.md` | 安全政策：guard 怎么拦、诚实局限（读命令文本、bash 后门）、报告途径。如实，不夸大 |
| D5 | `docs/qa/README.md` | QA 方法论：docs/qa 布局（T-*/case-*、run.sh、run-all.sh、lib/qa.mjs、gaps.md），prompt-as-code 的验证方式 |
| Q1 | **规则→守卫映射** `docs/qa/rule-guard-map.md` | 扫**全部 `roles/*.md`**（10 个角色提示文件）+ `docs/design/tasks.md`（DoD）+ `principles.md`，把每条用户能看到的规则列一行：规则原文 + 归属 + 守卫状态（`guarded`=有 verify/QA case 守；`bare`=裸，靠角色自觉；`judgment`=本质不可守卫的散文规则，标注不硬造 guard）。**本作业核心产物**，把"裸规则"第一次变可见、可核对 |
| Q2 | **映射配套 verifier** `tools/verify-rule-guard-map.mjs` | 不判覆盖率够不够（要人为定阈值，不在本作业），守**清单不撒谎**：每个角色文件有计数条目；每条标 `bare` 的规则能从 `roles/*.md` grep 到原文；标 `guarded` 的 guard 能解析到真实 verify/QA 文件。进 `scripts.test` |
| Q3 | **CI link checker** | `test.yml` 只跑 npm test；加 markdown 链接检查（轻量 node 脚本，不引入需 npm install 的依赖） |

## 明确不在范围

- `docs/reference/api.md` / `config.md` / `plugin.md` 及 `docs/reference/` 目录 —— 不创建（无 API）。
- 修 T-108 case-03 —— 已绿，不做。
- **补 `bare` 规则的守卫** —— 本作业只产出映射 + verifier，逐条补守卫是 **Q1 之后的后续作业**。
- **不拆 `roles/*.md` 结构** —— 仍一角色一文件，保持 dsh 注入和全部现有 pin。不做"一规则一个 md"。
- 新 prompt 内容（新角色/新规则）—— 那是别的作业。

## 语言和栈

- 语言：英文（D1/D3-D5/Q1/Q2/Q3），中文只有 D2（README-zh 镜像）。
- 测试命令：`npm test`（Q2 纳入后仍全绿；Q3 属 CI 步骤，本地 `npm test` 不改）。
- 不新增运行时依赖（仓库"无依赖"哲学；Q1/Q2/Q3 用 node 内置实现）。

## 发布准则

| 项 | 判定 |
| --- | --- |
| D1-D5 | 文档如实反映现状，无编造 API/行为；README 中英 Quick start 逐字对应 |
| Q1 | `docs/qa/rule-guard-map.md` 覆盖全部 10 个 `roles/*.md`，每行有原文/归属/守卫状态 |
| Q2 | `node tools/verify-rule-guard-map.mjs` 在 `scripts.test` 里跑、绿 |
| Q3 | CI `test.yml` 有 markdown 链接检查步骤且过 |
| 验收 | `npm test` 全绿；issue #8 的成立项完成、不成立项已说明 |

## 排期

一个里程碑，D1-D5 与 Q1-Q3 **并行**（无依赖链），一次 review 一轮。crew 执行，各过多轮 review。不发布 npm 版本。
