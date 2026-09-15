# Crew Settings 研究紀錄

日期：2026-08-24

## 研究範圍

本紀錄只讀取目前安裝的 DSH checkout：

`C:\Users\gilbe\AppData\Roaming\npm\node_modules\@deepseek-ai\dsh`

本次沒有套用 formal `web` profile，沒有執行 `dsh web`，也沒有讀寫生產環境
`C:\Users\gilbe\.dsh`。安裝樹的根套件是 `@deepseek-ai/dsh` `0.1.5-rc.1`，但
核心 nested packages（包含 `dsh-tool-subagent`、`dsh-agent`、`dsh-llm` 與
`dsh-persona`）多數是 `0.1.5-rc.2`；以下以實際讀到的 `lib` 與型別檔為準。

## Settings host contract

DSH host 的 `@deepseek-ai/dsh-settings` 提供：

- `ctx.inject(["settings"], ...)` 取得 host settings service。
- `settings.installSection(owner, namespace, schema, entry, hooks)` 將 composition
  `entry` 設為 base/fallback，將 user settings 合併在上面，並以 `setSource` 提供
  目前 authoritative source。
- 合併順序是 schema defaults → composition base → user section；plain object
  遞迴合併，陣列整體取代。
- `hooks.onChange` 在 attach、detach 與已提交變更時呼叫。Settings service 的
  `update`、`replace` 與 client 的 `mutate` 會走 revision fence。
- namespace descriptor 會提供 `ns`、`schema`、resolved `value`、`base`、raw
  `user`、`revision` 與 `applies`。`user` 中的 key 是否存在，才是判定 override
  的依據；即使值等於 base，也不能只靠值比較。

因此角色路由不建立第二份 host 設定快取。`dsh-crew-roles` 的 settings source
直接驅動 role tool 的 `Fiber.update()`；沒有 settings provider 的非 Web 組合仍
使用既有的 preset `roleModels` composition entry。

## Browser settings contract

`@deepseek-ai/dsh-client-ui-settings` 的 `ctx.settingsScope.bind({ namespace })`
提供 namespace scope：

- `getSnapshot()`：`status`、resolved `value`、`base`、raw `user`、`revision`、
  `writable` 與 `mode`。
- `subscribe(listener)`：追蹤 host/connection 更新。
- `mutate(ops, expectedRevision?)`：以同一 revision fence 原子套用多個 path 操作。
- stale revision 會拒絕；client 應保留 draft、顯示衝突並讓使用者重新載入，而不是
  靜默覆蓋別人的修改。

正式 Settings 左側頁面使用 `settings.section` root slot。DSH 官方 Agent Preset
registration pattern 讀到的 contract 是 `name`、`id`、`order`、locale-aware `label`、
`locale` 與 optional `inject`；section component 收到 shell 的 `close`，其業務 state
仍由 registrant 自己的 inject face 與 store 提供。Crew 因此註冊 `id: "crew"`、
`order: 30`，直接在頁面 content column 顯示 PM/root 與九個 child role rows。

`@deepseek-ai/dsh-client-ui-settings-plugins` 仍是 DSH Plugins 分區自己的 runtime，
並宣告 `settings.plugins.tab` 與其巢狀的 `settings.plugin.item`；那個 keyed card
surface 不是 Crew 的 extension point。Crew client 不 value-import 其他 feature 的 UI，
也不在 `settings.plugin.item` 註冊任何 Crew component。

## Provider、Model 與 reasoning 來源

不能在 client 或文件中硬編 provider、model 或 capability table。官方來源是：

- `ctx.remote.session.modelCatalog()`：提供 host 當代模型目錄，含
  `default`、`routableProviders`、provider `groups`、model `id/name/description`
  與 adapter 宣告的 reasoning metadata。
- host LLM remote 的 `listProviders()` 與 `listConfigurableProviders()`：提供
  provider registry/configuration 資訊。
- exact route 的能力最後仍由 host LLM runtime 的 `resolveModelInfo` /
  `resolveCallConfig` 驗證；catalog 是 advisory，不能因為 model 不在目錄就把
  已儲存的值刪掉。

模型型別是：

```text
ModelProviderGroup { id, name, models[] }
ModelCatalogModel { id, name, description?, reasoning? }
ModelReasoning { efforts[{id, name, description?}], defaultEffort? }
ModelCatalog { default, routableProviders, groups, failures[] }
```

目前 UI 使用 `session.modelCatalog()`，並把 catalog 缺少但 settings 已儲存的
provider/model/effort 加回為 unavailable 選項。如此既不硬編 adapter 規則，也不
會因暫時斷線或 provider 下架而破壞設定。

## Child AgentOptions 與路由繼承

`@deepseek-ai/dsh-agent` 的公開 `AgentOptions` 只有：

- `provider?`
- `model?`
- `reasoningEffort?`
- `maxTokens?`

`@deepseek-ai/dsh-tool-subagent` 的 Config schema 也只接受這些欄位。模型工具呼叫
才使用 snake_case 的 `reasoning_effort`；這個 repository 不會把
`reasoning_effort` 或 provider-specific `thinking` 塞進 `AgentOptions`。DeepSeek
adapter 的 `thinking` 是 adapter/deployment 設定，不是 child-neutral option。

DSH child route 規則如下：

1. 沒有自己的 `agentOptions` 時，child 可繼承 parent route。
2. role 自己指定 model route 時，`provider` 與 `model` 一起形成 route；本實作只
   在 model 非空時建立 `agentOptions`，不建立空物件。
3. `reasoningEffort` 只在 role 自己有 model route 且值非空時傳入。沒有自己的
   route 時，舊的 reasoning 值不會被錯誤地套到繼承的 PM/session route。
4. route 改變且沒有明確 effort 時，DSH 會移除 route-owned effort，讓新 adapter
   決定自己的 default；同 route 時才有 parent reasoning inheritance。
5. child 建立前會呼叫 live `llm.resolveCallConfig`。不支援的 provider/model/effort
   會由 DSH 拒絕，不由 Crew 自行 alias、clamp 或猜測。

## Persona layering

`dsh-agent-presets.composeFrom(childCtx, parentCtx)` 會讓 child 使用 parent 當下的
standing composition generation；它不是重新讀取 preset roster。`dsh-subagent` 若收到
`persona`，會在 child scope 註冊同名的
`deployment:persona-prefix`，而 scoped section 會 shadow inherited/global prefix。
它不是把兩段文字串接。child request 不會改寫
`deployment:persona-suffix`。

實際 `@deepseek-ai/dsh-persona` schema 的必填欄位是 `prefix`，不是目前 Crew preset
曾使用的 `text`。因此 preset row 必須使用 `config.prefix`，並保留 `{{model}}` 與
`{{cwd}}` 的 DSH interpolation。因為 child role persona 會 shadow preset prefix，
語言政策不能只放在 preset persona；role-tools bridge 也要把政策附加在每個 child
role 的完整 persona 後面，PM prompt 則由 host section 附加一次。

## 角色與 settings 的相容性結論

- namespace：`dsh-crew-roles`。
- section：`{ roleModels: { [roleKey]: { provider?: string, model?: string,
  reasoningEffort?: string } } }`。
- provider/model/reasoning 皆維持字串，以容納暫時 unavailable 的既有 ID；不將
  動態 catalog 變成靜態 schema enum。
- preset row 內既有 `roleModels` 是 legacy composition base。Settings user layer
  有值時優先；沒有 host settings provider 時，legacy row 照舊生效。
- reset 使用 client 的 `unset ["roleModels", roleKey]`，刪除 user override；若舊
  preset row 仍有 legacy base，reset 的結果自然回到該 base，這是有意保留的升級
  相容性，不是隱藏的第二份 user cache。
- UI 不把 unavailable provider/model/effort 自動清除。使用者主動換 route 才會
  改寫該 role；空 model 的 route 不會被送進 tool config。
- 只有不完整的 draft route（source 為 settings/draft 且沒有 model）會擋 Save；
  catalog 已移除的 provider/model/effort 只顯示 warning，因為真正的有效性由
  child start 前的 host preflight 判定。

## 讀取 settings 值時的 own-property 要求

`roleModels` 是「以角色 key 為索引的 dict」，所以取值不能只做 `map[key]`。DSH settings
的 merge 會把 user section 的 key 複製到 parsed 物件上，而 `__proto__` 這種 key 會變成
結果物件的 prototype：`JSON.stringify()` 看不到它、`Object.hasOwn()` 也回 false，但
`map[key]` 讀得到。實測 `roleModels.__proto__ = { engineer: { provider, model } }` 之後，
`resolved.roleModels.engineer` 會回傳那條 UI 完全看不到的 route。

因此本實作的規則是：

- 取值一律走 own-property helper（`roleModelFor()`、`configValueFor()`），
  `roleAllow`/`roleDeny` 也一樣。
- clone 進 null-prototype 物件，並丟棄 `__proto__`/`prototype`/`constructor`。
- 形狀不合法的 legacy route 直接讓 crew 不啟動（在 mount 之前），而不是靜默保留。

## Client bundle 限制

此 repository 原本沒有 build step。DSH client loader 需要 package 的
`exports["./client"]` 與 `dsh.client` declaration，且 client 檔需註冊
`window.__ModuleLoader__.load({ id, factory })`。本次保留零框架新增、零 server 的
策略，提供一個手寫的 browser-safe client bundle；它只透過 Cordis services、settings
scope、model catalog 與 slot contract 互動，不 import host Node module。

DSH 非 loopback/沒有 host durable settings 的頁面可能把 settings scope 暴露成
unavailable 或 process-local memory。官方 Configurable Plugins surface 會依 namespace
交集隱藏 unavailable card；host 可讀但不可寫時 card 會顯示 read-only。這不是 Crew
自己能修正的 persistence 缺口，文件與手動驗證必須明確說明。
