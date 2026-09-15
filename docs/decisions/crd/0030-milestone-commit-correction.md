# CRD 0030 — M1 必須保留本地 task commit

- **誰提出**：PM（恢復 `browser-client-boot-graph` 時發現）
- **希望**：更正 PRD v1 的「不 commit、push 或 publish。」；本作業應不 push、不 publish，但 M1 完成時仍依 team lane 流程保留一次本地 task commit。
- **原因**：PRD 的這句話與已固定的 team lane 規則「一個里程碑等於一次完整循環加一次 commit」相衝；若不更正，M1 不可能同時滿足 PRD 與任務流程。
- **影響**：`docs/design/prd-2026-09-15-browser-client-boot-graph.md` 的 `Corrections`；M1 的 `T-136` task commit；不改變產品行為、使用者可見範圍、push 或 publish 權限。
- **成本**：不需重做程式或測試；完成 gates 後增加一次本地 commit，commit 仍由 PM 執行。
- **決定**：`accepted`，由 PM 決定。這是對互相矛盾流程文字的可見更正，不是新增產品範圍；本作業仍不 push、不 publish。
- **DoD items added**：無。
- **Applied**：`docs/design/prd-2026-09-15-browser-client-boot-graph.md` v2；`state.json` `docs.prd` 2。
