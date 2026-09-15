# PRD：Browser Client Boot Graph 修正

- **日期**：2026-09-15
- **版本**：4
- **作業 slug**：`browser-client-boot-graph`
- **車道**：團隊（team）
- **規模**：小型修正；單一 package loader 邊界、單一 regression test，不新增 UI 或 runtime 能力

## 目標（problem，不是 solution）

DSH Web 的 active Loader row 目前以 `dsh-crew/host/crew.js` 這個 package subpath 出現。已安裝 DSH 的 `ClientModuleRegistry` 只把 exact bare package specifier 當成 package root；因此它不會從這個 row 找到 `dsh-crew` 的 `dsh.client` 宣告與 `exports["./client"]`，導致 `window.__DSH_BOOT__` 沒有 `dsh-crew` entry 或 batch。原本已完成的 `settings.section` 註冊因此無法進入瀏覽器載入圖。

本作業讓同一個 `dsh-crew-core` Host plugin 以 package root row 被 DSH 組合，同時保留既有 Host 行為與 Crew settings semantics，並用 isolated boot-graph regression test 鎖住這個 production failure mode。

- **問題陳述補充（2026-09-15；保留上方已確認文字）**：`dsh-crew` 是 package 名稱；`dsh-crew-core` 是該 package 在 Loader row 使用的 Host plugin id。此目標要處理的 problem 是 active Loader row 使用 package subpath，導致已安裝的 `ClientModuleRegistry` 無法辨識 package root，讓既有 `settings.section` 註冊無法進入瀏覽器載入圖。上方 root row、Host 行為與 regression test 的敘述是 implementation context，不是新增的產品需求。

## 不在範圍

- 不修改 `C:\Users\gilbe\.dsh`、production profile、production DSH process 或 DSH Core。
- 不執行 `dsh.cmd plugin --profile web add .`、`dsh.cmd plugin --profile web remove dsh-crew`、`dsh.cmd web` 或 `production --dump-config`。
- 不新增第二套 UI，不修改 `settings.section`、`settings.plugin.item`、`dsh-crew-roles` namespace、`roleModels`、Provider、Model、Reasoning 或任何 frozen runtime contract。
- 不改動 `dsh-crew-core` 的 row id、config contract、Host implementation、git-guard row 或 pm-write-guard row 的語意；不新增重複 core mount。
- 不 commit、push 或 publish。

## 語言和 stack

- 語言：ES modules JavaScript；Node.js `>=18`（由 `package.json` 宣告）。
- Package manager：npm；repository 沒有 lock file。
- Framework / database：不使用；這是 DSH plugin package。
- 測試：既有 Node 驗證腳本與 shell QA runner；完整命令為 `npm.cmd test`，新增 boot-graph regression 直接命令為 `node tools/verify-client-boot-graph.mjs`。
- DSH integration test 使用 temporary `DSH_HOME`；不得觸碰真實 `~/.dsh`。不新增 production dependency。
- 未採用的方案：額外 no-op anchor row 或 package-root facade；現有 Host plugin 可由 root export 直接解析，因此會增加 mount 複雜度而沒有必要。

## Corrections

- 2026-09-15，v1 → v2：PRD v1 的「不 commit、push 或 publish。」與 team lane 的里程碑必須包含一次本地 commit 相衝。更正為：本作業不 push、不 publish；M1 完成時仍依流程保留一次本地 task commit。此更正不改變使用者可見範圍或外部發佈權限，commit 仍由 PM 在所有 gates 通過後執行。
- 2026-09-15，v2 → v3（CRD 0031）：doc review 指出 `## 目標（problem，不是 solution）` 的既有第 13 行同時含有 implementation/test context，且 `dsh-crew` 與 `dsh-crew-core` 的關係未明。已保留 v2 的確認文字，並在目標段落新增 problem-boundary clarification；不改變產品範圍、DoD、milestone、stack 或 runtime contract。
- 2026-09-15，v3 → v4（CRD 0032）：使用者回報 Crew 導覽存在但內容全空。新增最短修正範圍：settings scope 尚未 ready 或 unavailable 時，頁面仍顯示完整唯讀 UI 與明確狀態；不重構 Host／agent settings ownership。
