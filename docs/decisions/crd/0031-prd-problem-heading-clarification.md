# CRD 0031 — PRD problem heading clarification

- **誰提出**：`crew-doc-reviewer-15`（M1/T-136 doc review）
- **希望**：釐清 PRD `## 目標（problem，不是 solution）` 下的 problem-only 邊界，並說明 `dsh-crew` package 與 `dsh-crew-core` Host plugin row id 的關係；保留已確認的原文，不以靜默改寫取代它。
- **原因**：doc review 指出目標段落第 13 行同時描述實作與測試手段，且 `dsh-crew`／`dsh-crew-core` 的關係未明確說明，讀者可能把 problem 與 solution 混在一起。
- **影響**：`docs/design/prd-2026-09-15-browser-client-boot-graph.md` 的目標段落與 `Corrections` heading；不改產品範圍、DoD、milestone、Language and stack 或任何 runtime contract。
- **成本**：新增一段 problem-boundary clarification、升 PRD 版本並重跑本文件的 doc review；不需重做程式、QA case 或測試。
- **決定**：`accepted`，由 PM 決定。這是對已確認 PRD 文字的可見文件澄清；原句保留，補充文字明確把 problem 與 implementation context 分開，並說明兩個名稱的關係。
- **DoD items added**：無。
- **Applied**：`docs/design/prd-2026-09-15-browser-client-boot-graph.md` v3；`state.json` `docs.prd` 3。
