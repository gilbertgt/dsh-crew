# Crew Settings 設計

日期：2026-08-24
狀態：實作設計

## 目標與不變事項

Crew Settings 只增加原生 DSH Web `settings.section` 設定頁與每個 child role 的 model route；不改變
Crew 的 PM-only 通訊、flat child topology、`maxDepth: 1`、role filter、reviewer
read-only、Git guard、PM write guard、task/QA/review workflow、jobs 或 resume。

PM 仍是 root session，不新增 `pm` role，也不把 PM 寫入 `roleModels`。每個 role
仍由 `host/roles-preset.js` 以一個 `@deepseek-ai/dsh-tool-subagent` instance
提供，固定使用：

```text
provider: spawn
backgroundMode: continuable
maxDepth: 1
persona: role markdown + Taiwan Traditional Chinese policy
toolFilter: existing role allow/deny
```

## Namespace 與資料模型

### Canonical namespace

```text
namespace: dsh-crew-roles
```

Settings section 的 schema 是：

```yaml
roleModels:
  <role-key>:
    provider: <string, empty allowed for legacy inheritance>
    model: <string, empty means inherit>
    reasoningEffort: <optional string>
```

合法 role keys 仍由 `host/roles.js` 的九個 `ROLES` 決定：

```text
researcher, architect, engineer, test_engineer, code_engineer,
qa, code_reviewer, security_reviewer, doc_reviewer
```

schema 不列舉 provider/model/effort，也不把 role key 鎖成 enum。Provider catalog
是 live adapter 資料；未出現在當下 catalog 的已存字串必須保留。

### Precedence

1. schema default：`roleModels: {}`。
2. legacy composition base：安裝 preset row 既有的 `config.roleModels`。
3. Settings user section：`dsh-crew-roles`，優先於 base。
4. role runtime：從目前 settings source 產生 `agentOptions`。

沒有 settings provider 的非 Web/舊 DSH 組合，仍使用 legacy `config.roleModels`。
有 settings provider 時，user layer 由 host `SettingsProvider` 儲存；它不是另一個
runtime cache。Settings save 後，role plugin 的 Fiber 以 `update()` reload；reload
失敗會保留舊 tool 並在 host logger 留下可行動訊息。

舊 preset 的 `roleModels` 是 base 而不是 user override。UI 的 reset 會刪除
`roleModels.<role>` 的 user key；若使用者尚未移除舊 preset line，reset 後自然回到
legacy base。這讓升級不會遺失舊設定，也不會偷偷改寫使用者的 preset。

## Host/agent runtime

`host/roles-settings.js` 集中管理 namespace、Schemastery schema、route map clone
與 `roleAgentOptions()`。它的規則是：

- route 的 `model` 不是非空字串時，回傳 `undefined`；role tool config 完全省略
  `agentOptions`，讓 DSH 使用 parent/PM session route。
- model 有值時才傳 `model`，provider 有非空字串才傳 `provider`。
- `reasoningEffort` 只有在上述自有 model route 存在且字串非空時才傳入。
- 不傳 `thinking`，也不把 model-facing snake_case `reasoning_effort` 混入
  `AgentOptions`。
- 三個欄位都只讀 own property。route map 與 route 都複製到 null-prototype 物件，
  `__proto__`/`prototype`/`constructor` 這類 key 直接丟棄；`cloneRoleModels()` 對
  形狀不合法的 legacy route（null、primitive、非字串欄位）丟出錯誤，而不是靜默保留。

`roles-preset.js` 先做既有 role filter 全量 validation，再讀取所有 persona。每個
role 的 persona 是 `readRoleText()` 的結果加上同一份 language policy；這保證自訂
`rolesDir` 不能拿掉政策。role tool 先照既有設定 mount，然後以 optional
`ctx.inject(["settings"], ...)` attach namespace。初始 settings source 或後續變更
都透過同一個 `roleConfig()` 計算；已存在的 Fiber 以串行 `Fiber.update()` reload，
不以第二份 tool registration 造成 duplicate tool。

`roleAllow`/`roleDeny` 與 legacy `roleModels` 的讀取只認 own property：繼承而來的
`__proto__` key 不能偷偷替 reviewer 換一份 allow list，也不能注入 UI 看不到的 route。
legacy `roleModels` 在**任何 mount 之前**驗證，壞值會讓整個 crew 不啟動，而不是留下半個
crew。settings 變更後若新 config 被 host 拒絕，`updateRole()` 會把最後一次真正生效的
config 重新套回該 Fiber：Cordis 的 `Fiber.update()` 先寫入新 config 再 restart，失敗時
自己不會 rollback，少了這一步，一個暫時失效的 provider 會讓那個 role tool 消失到下次重啟。

Settings provider 的 attach/detach 不會改變 role filters、persona 或 max depth。若
沒有 `settings` service，`ctx.inject` 不會阻擋既有 role mount。

## Browser settings section

### 插槽與可見性

package 新增 `exports["./client"]`，`dsh.client` 宣告 Web client bundle，並依賴：

```text
@deepseek-ai/dsh-client-locale
@deepseek-ai/dsh-client-ui-settings
@deepseek-ai/dsh-api-remotes
```

client 以 DSH 正式的 `settings.section` root slot 註冊 Crew 頁面：

```text
name: settings.section
id: crew
order: 30
label: () => t("nav")
locale: dsh-crew-settings
```

`order: 30` 讓 Crew 與 Agent Preset 同級，並排在 General、Models、Plugins 等主要
內建設定頁之後；它不插入 Models 或 Plugins 之前，避免改變主要 built-in navigation
的閱讀順序。這個頁面由 Crew client 自己擁有，不 value-import Models、Plugins 或
Agent Preset 的 UI component，也不再註冊 `settings.plugin.item`。

### 設定頁版面

頁面標題為「Crew 角色模型設定」，內容先顯示不可編輯的：

```text
PM / Root Session — catalog.default 的 provider / model / reasoning effort
```

這代表目前 host catalog 的新 session default；Settings 是全域設定頁，不假裝它是
某個已開啟 session 的即時選擇。接著顯示九個 child role，每列有：

1. route mode：`繼承 PM / Session` 或 `自訂 route`；
2. Provider select：來自 `modelCatalog.groups`；
3. Model select：來自所選 provider group；
4. Reasoning Effort：只從 exact model 的 `reasoning.efforts` 建立選項，並保留
   已存但消失的 effort 為 unavailable；沒有 reasoning metadata 時只顯示
   adapter default/inherit 說明，不自己發明 effort。

Stored-but-unavailable provider/model/effort 不會被移除，會以 disabled unavailable
option 與警示狀態顯示。使用者主動換 provider/model 後，才用新的 live catalog
值取代該 role；route 改變時清除 draft 中舊 route 的 reasoning，避免將舊模型的
level 帶給新模型。從 inherit 切到 custom 時，預填值是 `catalog.default`（若它仍在
catalog 內），不是「第一組的第一個 model」。

只有「不完整的 draft route」會擋 `Save`：`source` 為 settings/draft 且 model 為空時顯示
invalid，並停用 Save。catalog 已移除的 provider/model/effort 只顯示 warning，不擋存檔，因為
真正的有效性由 host preflight 判定（見下）。既有的壞掉 stored route 也會顯示自己的錯誤，
但不會擋住其他 role 的存檔：寫入只送有改動 role 的 path ops，擋住並不能修好它。

設定頁維持 draft，不在每次 select change 時寫檔：

- `Save` 只對有改動的 role 發送 `mutate` path ops。
- custom route 使用 `set ["roleModels", roleKey]`；inherit/reset 使用
  `unset ["roleModels", roleKey]`。
- draft 開始時記住 scope revision。revision 已前進時不送覆蓋寫入，保留 draft
  並顯示「設定已在其他位置更新」；使用者可 Discard 重新讀取。
- save 成功後 scope mirror 更新，設定頁清除 draft；失敗保留 draft 並顯示錯誤。
- namespace unavailable 時，`settings.section` 導覽仍保留 Crew entry，但 section content 依 scope
  狀態不渲染；scope ready 但非 writable 時，頁面保持可見且 controls/Save disabled。不嘗試
  localStorage 或直接寫
  `C:\Users\gilbe\.dsh`。

### Catalog refresh

Controller 初始與下列事件後呼叫 `ctx.remote.session.modelCatalog()`：

- `llm/adapters-updated`；
- `settings/document-updated`（provider settings 可能變更）；
- `connection/reset`（丟棄暫時 catalog、保留 host scope 的 draft 規則）。

所有 provider/model/effort label 都取自 response；client 不帶 DeepSeek 特定
`off|low|high|max` table，也不假設 catalog membership 是 request validity。
Exact validation 仍由 host `llm.resolveCallConfig` 在 child start 前完成。

## Taiwan Traditional Chinese policy

Policy 同時放在三個必要位置：

1. `preset/crew/agent.cordis.yml` 的 DSH `persona.prefix`，取代目前與實際 DSH
   schema 不符的 `config.text`；保留 `{{model}}` 與 `{{cwd}}`。
2. `host/crew.js` 的 PM system-prompt section。
3. `host/roles-preset.js` 對每個 child role 完整 persona 的尾端。

這不是把政策放在一個會被 child shadow 掉的 global prefix。政策要求所有 user-visible
自然語言使用 Taiwan Traditional Chinese，child 只向 PM 回報且也用同一語言；程式碼、
指令、路徑、識別字、API/package 名稱、exact log/error 保持原樣。既有 role filter、
文件寫入界線與 tool-result/data 安全文字不修改、不被語言政策取代。

## Installer、版本與升級

目前 `package.json` 保持已發布的 `0.10.0`，`CHANGELOG.md` 以 `0.11.0 — unreleased`
記錄這次 user-visible change；正式發布日才把版本與 changelog 日期一起前進。為了讓
開發中的 preset 變更不必假裝已發布，`host/crew.js` 的 stamp 同時記錄 package version
與 shipped-preset revision（目前 revision `2`）：

- 版本或 shipped-preset revision 改變時，才替換 dsh-crew 自己的 stamped preset；兩者都
  相同時不重寫。
- 使用者編輯或新增的 preset 檔案先儲存為 `.bak`，boot log 明確列出並說明舊的
  `roleAllow`/`roleDeny`/legacy `roleModels` 需要重新套用；既有 `.bak` 檔案會原樣帶到新
  preset，不會變成 `.bak.bak`。
- 有檔案需要保留時（edited/added 檔案或既有 `.bak`），升級在刪除 target 前另寫入
  `.agent-presets/crew.backups/` 的 durable archive；即使 target-side `.bak` 寫入失敗，
  使用者編輯、binary bytes、舊 backup 都仍可復原。乾淨的 stamped refresh 不會建立 archive。
  Settings user layer 不在 preset folder 內，所以正常 preset refresh 不會被 `.bak` 機制刪掉。
- 既有 `roleModels` 是 base fallback；不要求使用者先手動遷移才能啟動。
- 發布 `0.11.0` 時保留 revision `2`；只有 shipped preset 內容變更才遞增 revision。Installer
  永遠以 package version 與 revision 兩行判定是否刷新，並讓 stamp、package version、release
  notes 一起驗證。

這份設計不執行 production install。整合測試只建立每次全新的 temporary `DSH_HOME`
與 synthetic provider/model 設定。

## 驗證矩陣

| 行為 | 自動驗證 |
| --- | --- |
| namespace/schema、空 model 省略 AgentOptions | source checks；有 DSH link 時才執行 schema/runtime checks |
| provider/model/reasoning 傳入 camelCase AgentOptions | 有 DSH link 時由 mount check 對 actual `tool-subagent` Config 驗證；plain checkout 會明確 skip |
| reasoning 沒有自有 route 時省略 | `verify-role-settings.mjs` fake-context/runtime helper checks |
| `maxDepth: 1`、role filters、reviewer allow list | 既有 `verify-mount.mjs` |
| preset 使用 `prefix`、繁中政策仍在升級後檔案 | mount/install checks |
| client declaration、bundle loader、section mount/dispose、settings slot | `verify-role-settings.mjs` 與 package-shape checks；未執行真實瀏覽器 fixture |
| model catalog / unavailable preservation / no hardcoded capabilities | client source checks；需手動 Web check 驗證真實 catalog 與 UI |
| revision conflict draft 保留 | client source checks；需手動 Web check 驗證雙 writer conflict |
| temporary DSH_HOME upgrade/no production writes | `verify-preset-install.mjs` |
| PM/child/role communication policy | mounted prompt and persona checks |

### 手動 Web 驗證（不由 repository checks 執行）

1. 在使用者自己的可持久化 DSH Web profile 中重新整理頁面，開啟 Settings 左側的 `Crew`。
2. 確認右側直接顯示 PM / Root Session、九個 child role rows，以及 Provider、Model、
   Reasoning Effort 控件；確認 host 提供的 `dsh-crew-roles` namespace 沒有被改名。
3. 讓一個 role 從 inherit 切到 custom，從 live catalog 選 Provider、Model 與可用的
   Reasoning Effort，Save 後重新整理頁面及建立新 child，確認值保留並送入 `AgentOptions`。
4. 選取另一個 Model，確認舊 route-owned effort 被清除；選回沒有 reasoning metadata
   的 Model，確認 UI 不發明 effort 選項，且既有未知值仍顯示 unavailable。
5. 在第二個 Web writer 先提交同一 namespace，再從第一個視窗 Save，確認 revision conflict
   不會覆寫 draft；Discard 後重新載入，確認第二個 writer 的值保留。
6. 在無法持久化或 read-only 的連線開啟 Settings → Crew，確認 section 不自行建立 local
   persistence；ready-but-not-writable 時顯示 read-only 且不寫入本機檔案。

## 已知限制

- Role route 的 exact provider/model/effort validity 是 child start 時 DSH live
  preflight 的責任；Settings schema 不會把 dynamic adapter data 凍結成 enum。
- Settings section 顯示 `modelCatalog.default` 作為 PM/Root Session 的 host default，
  不是讀取某個已開啟 Session 的 private pending selection。
- 某些非 loopback Web 頁面只有 process-local memory settings 或 scope unavailable；Crew
  section 的導覽仍由 `settings.section` 註冊，但 content 會依 scope 狀態不渲染，host 可讀
  但不可寫時頁面會如實顯示 read-only，不會自行建立 persistence。
- 手寫 browser bundle 沒有在此 repository 引入 bundler；若未來 DSH 提供標準 build
  tool，client 檔可由等價 source build 取代，但 `exports`、module-loader id、slot
  contract 與 service 注入必須維持不變。
