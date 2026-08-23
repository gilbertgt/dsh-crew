# PRD：把「PM 何时委派」写进 roles/pm.md

- **日期**：2026-08-23
- **版本**：1
- **作业 slug**：`delegation-in-pm`
- **车道**：团队（team）——一处文档改动，走一个 milestone、一个任务

## 目标（problem，不是 solution）

`roles/pm.md` 现在对「PM 什么时候自己动手、什么时候委派给谁」没有一个集中的、可对照
的标准。散落在 `## What you may write`（谁写什么的表）、`## Step 1`（没有 PM 自己改文件的
车道）、team flow 的 step 9（怎么派工程师）里。缺的是：**一个一进来就能查的清单**，回答
两件事——

1. 这个活 PM 能不能自己做？（给一个明确、封闭的「PM 专属」集合）
2. 确定要委派时，委派给哪个 crew role？按什么标准选？

背景：这个仓库自己已经两次抓到「PM 直接改文件、事后补任务行」（T-92、T-111）。这节不
解决问题本身——它让 PM 在每个请求进来时先走一遍「该不该自己碰」，把判断从「靠 PM 记着
规则」变成「进来就先查」。

## 必须做什么（need，不是 solution）

- **N1**：在 `roles/pm.md` 里加一节，标题用英文，放在 `## Step 1: pick a lane, every time`
  的正文里（作为 `###` 子段，**不新增顶级 `##` 节**——T-56 把 pm.md 钉死在恰好 14 个顶级节）。
- **N2**：三条线，必须都有——
  - 线一：PM 能自己动手的封闭集合（PRD/CRD/ADR/Verdicts、流程账本、run-all.sh/gaps.md、
    仓库规则文件 CLAUDE.md/principles.md/本文件）。其它一律委派，错别字也在内。
  - 线二：委派给谁。按「这活要什么」选：`crew_engineer`（test-first 代码）、`crew_researcher`
    （事实/选项）、`crew_architect`（拆分设计）、`crew_qa`（验证案例）、对应 reviewer（评审）。
  - 线三：两件 PM 必须自己在场——和用户对话/要许可；一切 git 动作。
- **N3**：整节纯英文——T-63 把 `roles/pm.md` 钉在「无 CJK 字符」。
- **N4**：不引入 agent-teams——本作业的委派对象只有 crew role。

## 不在范围

- 不改「谁写什么」表本身（`## What you may write` 那张表）。它已经是对的；这节只是把它的
  要点重述成一个「进来先看」的清单，不推翻它。
- 不新增任何 QA case / 不新增任何 verify 检查——这节是散文，靠 doc review 把关，不新造钉住
  它的门。T-56/T-63 已有的钉住保持绿即可。
- 不动 `agent-teams`（用户已定不要它）。

## 执行归属（为什么这是 PM 落地，不是工程师，请确认）

`roles/pm.md` 是 **judge the work 的规则文件**——它衡量每个 role（工程师、QA、评审）的
工作的标准。`roles/pm.md` 的 `## What you may write` 明文写死：

> A role editing those is changing the rules it is working under, **which no task
> row can authorise**（line 77-78）

这正是读者面向文件（README/CHANGELOG）被允许「工程师在任务下改」而规则文件不是的原因：
规则文件 judge 所有 role 的工作，让任一 role 在任务下改写它就是「被评审方改写测试」——
这个仓库踩过这个坑（T-92、T-111 两次）。

所以：**engineer 不能改 pm.md，即使 pm.md 就是任务本身**。理由不是「PM 想留权」，而是
line 78 那条铁律——工程师改它就是改写衡量自己的标准。

「让 crew 参与」这一次的正确含义不是「工程师动手写」，而是：
- **PRD**（opening document）— PM 写，你（用户）确认；
- **任务行 T-112**（注意这一行是本次工作的单元）— PM 写 DoD，落到 tasks.md；
- **落地** — PM 改 `roles/pm.md`（它是 PM 自己的规则文件，唯一合法执行者）；
- **doc review** — 由 `crew_doc_reviewer` 独立审这次改动（这是 crew 把关的部分）；
- **提交** — 带任务号 `(crew T-112)`，PM 执行。

如果你坚持「工程师应该改 pm.md」，那要先改 `## What you may write` 那条规则（放开 rule
file 给任务下工程师改）——那是另一个 **change request**，得单独写 CRD + 你同意，因为它
动的是判定文档本身。本 PRD 默认不放开它。


## 语言和栈

- 语言：**英文**（代码、文档、提交都英文；本 PRD 用中文是因对话语言,落在仓库的产物按
  `roles/pm.md` 现有的英文写）。
- 改动的文件：`roles/pm.md` 一个。
- 测试命令：`npm test`（含 T-56 顶级节计数、T-63 无 CJK 两个钉住）。

## 发布准则（release criteria）

| 项 | 判定 |
| --- | --- |
| 结构 | `roles/pm.md` 顶层 `## ` 节仍恰好 14 个（T-56 绿） |
| 语言 | `roles/pm.md` 无 CJK 字符（T-63 绿） |
| 可读 | 三条线都写成能被 doc reviewer 判断的清晰语句 |
| 验收 | `npm test` 全绿 |

## 排期

一个小任务（T-112），今天内。不发布——这只是一个仓库内规则文件的改动，不涉及 npm 版本。
