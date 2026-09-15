# CRD 0033 — QA 子代理無法寫入 case 的完成路徑

- **Who asked**：PM，因 QA 子代理執行 T-136 item 8 時遇到 runtime 寫入阻擋。
- **What they want**：本次不再新增 `qa/T-136/case-11-unavailable-render.mjs`；改以獨立 QA 已完成的 case 規格審查，加上 `tools/verify-role-settings.mjs` 的 test-first 紅燈與綠燈執行結果，作為 T-136 item 8 的驗證證據。Verdicts 的 `qa` 保持誠實記為 `not run — QA 子代理無法在目前 runtime 寫入 case`，不冒充 `pass`；其餘 code、security、doc review 與完整測試照常完成。
- **Why**：兩個新啟動的 `crew_qa` 子代理都回報 approval prompts disabled。Repository 內的 QA case 寫入被 `dsh-crew pm-write-guard` 當成 PM 寫入並拒絕；依規則，被拒的子代理不得重試或繞過。PM 也不能代寫 QA 專屬 case。
- **What it touches**：`docs/tasks/T-136.md` 的 DoD item 8、Corrections 與 Verdicts；`C:\Users\gilbe\.dsh\crew\jobs\browser-client-boot-graph\state.json` 的 QA stage。
- **Cost**：不增加產品程式碼；少一個 repository-local QA case，因此 unavailable render 的持久 regression 證據只存在於既有 `tools/verify-role-settings.mjs`。未來修正子代理 approval plumbing 後，仍需補 QA case。
- **Decision**：accepted — 使用者接受最短完成路徑；QA 不冒充通過，其餘 reviews 與完整測試維持原標準。
- **DoD items added**：0 項；T-136 v5 的 Corrections 新增 1 項 dated correction，記錄本次 QA `not run` 與 verifier 證據；既有文字未刪除。
- **Applied**：`docs/tasks/T-136.md` v5；`state.json` 已將 T-136 文件版本記為 5、加入 CRD 0033，並將 M1 QA stage 記為 skipped。
