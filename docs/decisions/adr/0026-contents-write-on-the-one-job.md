# ADR 0026：`contents: write` 授给整个发布 job，不拆 job、不用 PAT

- **状态**：accepted
- **日期**：2026-08-22
- **决定人**：**PM**（`gh-release` 作业，M1），安全评审第 1、2 轮复核为可接受
- **作业**：`gh-release`，任务 `T-101`

## 为什么现在才写

`docs/design/prd-2026-08-22-gh-release.md` 第七节写着「这一点会在 T-101 的 ADR 里写下来」，
**而那份 ADR 一直不存在** —— `T-101` 的 12 条 DoD 里没有一条要求写它，所以没有任何任务在做。
**最后一轮文档评审把这条当阻塞报了出来**：PRD 点名的交付物没人交，而这条决定今天只活在
`publish.yml` 的注释和 `docs/qa/gaps.md` 第 55 条里 —— 那两处都不是里程碑评审时
摆到用户面前、允许用户推翻的东西。ADR 才是。

## 在决定什么

`gh release create` 要写 GitHub 的 release 页面，写的是 `contents` 这个 scope。
所以 `.github/workflows/publish.yml` 的 job 必须拿到 `contents: write`。

**GitHub 的授权是 job 级的，不是 step 级的。** 所以同一个 job 里的每一步都带着这个写权限跑，
包括 `npm install -g npm@latest`（从网络下载并执行没有钉版本的第三方代码）
和 `npm publish`（会跑 lifecycle 脚本）。这就是要决定的事。

## 选项，以及为什么另外两个输了

### 选项 A（**选中**）：一个 job，整个 job 拿 `contents: write`

- **代价，写清楚**：`npm publish` 和 `npm install -g` 都在这个写权限底下跑。
  一旦 npm registry 上的 `npm` 包被投毒，那段代码就握着一把能改这个仓库历史的钥匙。
- **为什么还是选它**，安全评审第 1 轮的原话是决定性的两条：
  1. **对人不是提权。** 能推 tag 触发这个 workflow 的人，本来就对这个仓库有
     `contents: write`。放宽的是「跑在 job 里的代码」能碰到的东西，不是人的权限。
  2. **最贵的钥匙改动之前就在屋里。** 这个 job 早就有 `id-token: write` —— 拿它能铸一张
     OIDC 令牌去冒名发这个 npm 包。**发一个假包比改仓库历史更值钱。**
     所以这次多加的一把没有改变屋子的安全等级。
- **顺手做的一件事**：`actions/checkout` 加了 `persist-credentials: false`，
  这样那份写权限凭据不会在整个 job 里留在磁盘上给后面每一步用。
  出处查过（`docs/research/actions-checkout-persist-credentials.md`）：认证在第 150 行、
  拉取在 194–271、撤销在 321 行的 `finally` 里，所以 `fetch-depth: 0` 和私有仓库都不受影响。
  安全评审第 2 轮确认这条路**关掉了** —— 步骤是串行的，checkout 那一步跑完，凭据就没了。

### 选项 B（**没选**）：拆两个 job —— 低权限发布 job ＋ 高权限 release job

- **好处**：`npm publish` 那一步就不带写权限了，这是真正的最小权限。
- **为什么输，两条，都是硬的**：
  1. **`tools/verify-mount.mjs` 规定发布用的 workflow 只能有一个 job**（`jobCount` 那一段）。
     那条规矩有真实理由：跨两个 job 的时候，「取文字排在发布前面」「`npm test` 排在发布前面」
     这一类**靠文件先后位置**的判断什么都证明不了 —— 真正决定顺序的是 `needs:` 边，
     而那个文本 pin 读不了 `needs:`。**拆 job 会让这次作业新加的两条 pin 和设计规矩第 7 条
     那几条老 pin 一起失效。**
  2. **两个 job 之间要传 `release-notes.md`，就得走 artifact 上传下载**，
     或者第二个 job 自己再 checkout 一次、再读一次 CHANGELOG。前者多两步、多一处会坏的地方；
     后者等于把「取文字」这件事做两遍，而它是这次唯一没有测试守着的一段代码。
- 真要走这条路，代价是**先改那条「只能一个 job」的规矩**，那是另一次作业，要走 CRD。

### 选项 C（**没选**）：不用 `GITHUB_TOKEN`，改用一个 PAT（个人访问令牌）

- **好处**：能把 release 的权限从 job 的默认授权里摘出来，只给最后一步。
- **为什么输**：PAT 是**长期有效**的，要存成 secret、要有人记得轮换、泄漏了作用范围
  比一次 run 的短命令牌大得多。这个仓库现在**一个 secret 都没有**（npm 走 trusted
  publishing 的 OIDC，`publish.yml` 开头自己写着「there is no secret to store or rotate」）。
  **为了收紧一个 scope 而引进第一个长期 secret，是净亏。**

## 决定

**选项 A。** 一个 job，`contents: write` ＋ `id-token: write`，
加 `persist-credentials: false` 减少凭据在磁盘上的停留。

## 这条决定没有关掉的事

- **`npm publish` 仍然带着 `contents: write` 跑。** 记在 `docs/qa/gaps.md` 第 55 条，
  未关闭、刻意的。**没有任何用例判得了「权限是不是最小的」。**
- **`npm install -g npm@latest` 没有钉版本。** 安全评审第 2 轮说这是这个 job 里
  剩下的最大一条路，并建议收窄；它同时说清楚**钉版本也只是收窄不是关闭**
  （钉 `npm@11` 还是浮动的，钉死一个具体版本会随时间烂掉，trusted publishing 要 `>=11.5.1`）。
  **本作业没有做这件事**，它在 M1 的范围外，由用户在里程碑评审时决定要不要排。
- **`id-token: write` 同样是 job 级的**，在「只能一个 job」这条规矩下没有便宜的修法。
- **`persist-credentials: false` 这个键没有任何检查守着**：`verify-mount.mjs` 不读它，
  也没有 QA 用例判它，删掉它 `npm test` 照样全绿（文档评审报的，同样记在第 55 条）。

**用户可以在里程碑评审时推翻这条决定。** 推翻它意味着走选项 B 或 C，
两条都要先改这个仓库自己的规矩或者引进第一个 secret，所以那会是一次 CRD。
