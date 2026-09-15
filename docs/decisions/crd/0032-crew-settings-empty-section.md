# CRD 0032 — 修正 Crew Settings 空白頁

- **Who asked**：使用者。
- **What they want**：安裝目前版本後，Settings 左側仍有 Crew 項目，但點入後內容全空；需要恢復可見且可用的 Crew role model 設定內容。
- **Why**：Crew Settings 導覽已載入，但 Web host 沒有提供 `dsh-crew-roles` settings namespace。Client 的 bound scope 因此維持 `unavailable`，`CrewSettingsSection` 又在該狀態直接回傳 `null`。
- **What it touches**：`docs/design/prd-2026-09-15-browser-client-boot-graph.md`、`docs/tasks/T-136.md`、`host/crew.js`、`host/roles-settings.js`、`host/roles-preset.js`、`client/crew-settings.js`、`tools/verify-role-settings.mjs`、`tools/verify-client-boot-graph.mjs`、`qa/T-136/`，以及必要的 reader-facing files。
- **Cost**：M1 重新打開，但採最短路徑：不重構 Host／agent settings ownership；只讓 unavailable/loading scope 顯示完整唯讀 UI 與明確狀態，不再回傳空白，並補 regression test。既有 namespace 可用時的 persistence 與 role reload 流程不變。
- **Decision**：accepted — 使用者決定採最短路徑解決本次空白頁問題。
- **DoD items added**：1 item added to T-136's DoD：settings scope 尚未 ready 或 unavailable 時，頁面不可為空，且必須顯示九個角色與不可用狀態。
- **Applied**：`docs/design/prd-2026-09-15-browser-client-boot-graph.md` v4、`docs/tasks/T-136.md` v4；runtime 已完成，unavailable scope 會顯示完整唯讀 UI、九個角色與明確狀態，且 `node tools/verify-role-settings.mjs` 已完成紅燈後綠燈驗證。
