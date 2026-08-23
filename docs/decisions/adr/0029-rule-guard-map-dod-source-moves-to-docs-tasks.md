# ADR 0029 — rule-guard-map 的 DoD 来源迁到 docs/tasks/ 目录

- **日期**：2026-08-23
- **决定者**：PM（T-122d 的 Q-01）
- **状态**：accepted（已执行于 T-122d）

## 背景

`docs/design/tasks.md` 单一任务表迁到 `docs/tasks/`（一任务一文件）后，
`qa/rule-guard-map.md` 的 DoD 来源节 `### docs/design/tasks.md (DoD)` 指向不存在的文件。
T-122d 工程师以 Q-01 问 PM：来源怎么改、锚点怎么处理。

## 选项（Q-01 原文要点，工程师提出）

- **选项 A**：来源改 `### docs/tasks/ (DoD)`（目录形式）——verify-rule-guard-map 的 SECTION 正则
  接受目录路径，来源是目录时读目录下所有 `.md`，bare 锚点对所有文件行做子串检查，existsSync
  对目录通过；"规则行不变"读作规则含义/owner/status 不变，锚点文本随来源迁移重指。
- **选项 B**：（Q-01 中的其他选项，见 git 历史 `docs/tasks/T-122d.md` 与当时 Q-01 文件——
  现已被采纳的是 A；B 的具体内容记录在已删除的 Q-01 单次文件中，ADR 无法引原文，此处如实说明）。

## 决定（选项 A，PM 采纳）

1. 来源改 `### docs/tasks/ (DoD)`（目录形式）；verifier 接受目录路径。
2. "规则行不变" = 规则含义、owner、status 不变；锚点文本随来源迁移重指。
3. T-01 重复行删除（architect section 已有同一规则，不损失覆盖；目录里无锚点，留则必红）。
4. `docs/qa/<task-id>/` 锚点用 `docs/qa/T-*/case-*.mjs`（目录实际形状）。
5. 其余 bare 锚点重指：`DoD section` → `## DoD`、`docs/design/tasks.md` → `docs/tasks/`、
   `solo` 不变；计数行按实际改（7→6）。
6. intro 和 section 注释同步改指新来源。

## 为什么

任务表迁到目录后，映射的 DoD 来源必须指向真实存在的位置，否则 bare 锚点无法 grep-back 验证
（"map 不撒谎"检查会红）。选项 A 让 verifier 读目录，锚点绑定来源迁移，是最小改动且保持
映射的验证能力。

## 结果

`tools/verify-rule-guard-map.mjs` 接受 `docs/tasks/` 目录来源（T-122d 实现），
`qa/rule-guard-map.md` 的 DoD 节指向目录，计数 7→6，npm test 全绿。
