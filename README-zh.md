# dsh-crew

> **版本 0.10.0（下一版：0.11.0）。**

dsh-crew 是 DeepSeek Harness（dsh）的外掛。它會把 dsh 工作階段變成產品經理
（PM），並執行一個扁平的 crew；直接子角色包括 architect、engineer、test engineer、
code engineer、QA、code reviewer、security reviewer、doc reviewer 與 researcher。

## 這是什麼

你只和 PM 溝通。Crew 維持扁平，但 PM 只會在角色能提供相關專業或獨立驗證時啟動
child role。九個角色、model routing、Git guard、PM write guard、權限與 resume 支援
都維持不變。

兩條 lane，再選執行路線：

- `ask` — 你要一個答案。PM 回答，不修改任何內容。
- `team` — 你要一項變更。PM 會選最省、又足以承載該工作的路線：小型低風險變更走
  `direct`，由 PM 自己完成、不啟動 child role；一般 coding 走 `solo`，只啟動一位
  engineer、其他角色都不啟動；只有大型、跨模組、高風險或動到架構的工作才走
  `crew`，而且只啟動與該變更相關的角色。

是否需要 security review 是另一個問題，依固定清單單獨判斷。設定頁面、表單或下拉
選單雖然接受使用者輸入，仍然是 `solo`；若該變更同時動到登入或權限檢查，也維持
`solo`，另外加一位 security reviewer。

開發期間只跑 targeted tests。完整專案測試與 QA gate 在準備完成時跑一次；只有測試
失敗並修正後才重跑。已完成的階段會寫入 checkpoint，resume 後不會重做。Push 與
publish 仍然每次都要取得使用者本人的同意。

## 安裝

```sh
dsh plugin --profile tui add dsh-crew     # 或 --profile web
```

重新啟動 dsh，並在工作階段選擇 **Crew** preset。Web profile 也會在 host 提供設定
namespace 時載入原生 **Crew** Settings 專頁。

## 快速開始

1. 安裝外掛。
2. 重新啟動 dsh。
3. 使用 **Crew** preset 開始工作階段；你的工作階段會成為 PM。
4. 提出問題、要求變更，或在 DSH Web 開啟「Settings → Crew」，在此設定 child role
   的 model route。

## DSH Web 的 Crew Settings

**Crew role model settings** 是獨立的「Settings → Crew」專頁，使用穩定的
`dsh-crew-roles` namespace 儲存設定。它會顯示
host model catalog 目前的 PM/root 預設值，並為九個 child role 各顯示一列。每列都能
繼承 PM/session route，或選擇自己的 Provider、Model 與 Reasoning Effort。

Provider、Model 與 reasoning 選項都來自 DSH 的 live model catalog。UI 不會硬編任何
provider、model 或 capability table。已儲存的識別字若不再出現在 catalog，仍會保留並
標示為不可用，不會被靜默刪除。精確的 route 與 reasoning 驗證仍由 child 啟動前的
DSH host preflight 負責。

只有 Model 非空時才會送出 role route。它的 `provider`、`model` 與 `reasoningEffort`
是 child `AgentOptions` 的值。角色繼承 route，或沒有 route 自有 effort 時，才會省略
Reasoning Effort。若 catalog 沒有公布 reasoning 選項，UI 不會自行發明選項；既有的已儲存
值仍會保留，並由 DSH host preflight 作最後驗證。更換 Provider 或 Model 會清除 route
自有的 reasoning effort，避免舊 capability 套用到新的 route。

儲存與捨棄都是明確操作。儲存會帶上 settings document revision；若其他 writer 已更新
文件，Crew 專頁會保留草稿並回報 conflict，不會覆寫對方內容。唯讀 settings scope 會如實顯示。
若官方 Web settings scope 不可用，專頁不會自行假造 local persistence。

## 設定與相容性

Crew Settings override 都是選用的。Role model route 的優先順序如下：

1. schema defaults；
2. shipped crew preset 中 legacy `roleModels` 的 composition 值；
3. 由 `dsh-crew-roles` Web Settings namespace 提供的 user layer。

Namespace 固定，但是否持久化取決於 host：DSH 提供 durable settings backend 時，user layer
會跨重啟保留；process-local 或 unavailable scope 不保證保留。專頁不會改用 localStorage，
也不會寫入 production preset。

legacy `roleModels` 仍支援舊 profile 與非 Web composition。Tool filter 仍放在已安裝
preset 的 `roleAllow` 與 `roleDeny`。重設 Web override 只會移除該角色的 user-layer key；
若 preset 有 legacy route，之後可能再次顯示該 fallback。

Preset installer 只會修改由 dsh-crew 寫入且帶有 stamp 的 preset。Refresh 時，已編輯或
新增的 preset 檔案會先保留成 `.bak`，既有 `.bak` 也會原樣帶到新 preset，不會產生
`.bak.bak`，並在 boot log 中列出；需要保留任何檔案時，另會在 preset folder 旁寫入
durable pre-upgrade archive（乾淨的 refresh 不會建立）。Settings document 位於 preset
folder 之外，因此不會因 preset refresh 而被刪除。Source package 在 `0.11.0` 發布前維持已
發布的 `0.10.0` 版本；開發期間仍以 shipped-preset revision stamp 刷新變更過的 preset 內容。

## 語言政策

PM 與每個 child role 都使用臺灣繁體中文（繁體中文，臺灣用語）進行使用者可見的溝通
與報告。程式碼、指令、路徑、識別字、API 與 package 名稱、exact log 及 exact error
message 保持原樣。英文來源文字或 tool output 不會切換 crew 的溝通語言。

## 驗證

請執行 repository checks：

```sh
npm test
node tools/verify-role-settings.mjs
node tools/verify-mount.mjs
node tools/verify-preset-install.mjs
```

需要整合覆蓋時，檢查會使用 temporary folder 與 synthetic settings；不得讀寫 production
`$DSH_HOME`（預設為 `~/.dsh`，Windows 預設可視為 `%USERPROFILE%\.dsh`）。Plain checkout
會明確 skip 需要 DSH optional `dsh-tool-subagent` link 的 role-fiber 與 real role-tool mount。

## 授權

MIT
