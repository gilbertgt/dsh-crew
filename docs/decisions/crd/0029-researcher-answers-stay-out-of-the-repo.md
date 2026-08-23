# CRD 0029 — researcher 答案不再进入仓库（docs/research/ 删除）

- **日期**：2026-08-23
- **谁提出**：用户
- **状态**：accepted（用户决定，PM 执行）

## 用户要什么

删掉 `docs/research/`。researcher 的答案**不进入仓库**（"outside of repo, don't enter repo"）。

## 为什么

researcher 的答案是给 PM 做决策用的素材，不是仓库的持久文档。放进 `docs/` 是历史安排；
用户决定答案只在报告里，由 PM 吸收进自己的文档（PRD 依据、ADR、state 等）。

## 它改变了什么

- `docs/research/` 目录删除（3 个文件：actions-checkout-persist-credentials、document-types、req-part-b-audit）。
- `roles/researcher.md`：产出机制从"写 `docs/research/<name>.md`"改为**报告制**——答案在报告里，不写任何文件。
- `host/roles.js`：researcher 的 allow list 去掉 `write`（报告制下无文件产出，与 reviewer 一样只读）。
- `roles/pm.md`、`principles.md`：researcher 描述改报告制；"Who writes which document" 表删去 "A researcher's answer" 行。
- `CLAUDE.md`：durable-table 删去 `docs/research/` 行；document-types 链接移除（文件已删）。
- 历史提及保留：docs/decisions、旧 PRD/HLD、CHANGELOG（快照如实腐烂）。

## 成本

已做的迁移工作不需要重做（它是删除，不是移动）。document-types.md 的原始内容只在 git 历史里
（principles.md 的表格已吸收其出处引用）。

## DoD

- 活文档（roles/、CLAUDE.md、principles.md、README 对、CONTRIBUTING、SECURITY）无 `docs/research` 当前路径提及。
- researcher.md 明确"不写文件，答案在报告"。
- npm test 全绿。

## Applied

- T-135（任务行），commit ddf57f3。
- review 修复（researcher 残留、write 移除），commit 760a567。
