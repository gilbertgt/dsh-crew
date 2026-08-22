# PRD：发版本的时候自动建 GitHub release（`gh-release` 作业）

- **版本**：7
- **日期**：2026-08-22
- **作业 slug**：`gh-release`
- **提出人**：用户
- **版本历史不在本文件里。** 每次改动记在 `docs/decisions/crd/` 那份 CRD 的 **Applied** 行，以及
  git history 里。

---

## 一、要解决的问题

这个仓库有 **17 个 tag**（`v0.1.0` 到 `v0.9.0`），开工时**0 个 GitHub release**。
（**M1 评审之后是 1 个** —— 用户要求手工补了 `v0.9.0` 那一页，`CRD 0027`。）

npm 上每个版本都在，`CHANGELOG.md` 里也有写得很细的说明文字，但是开工时 GitHub 的
Releases 页面是空的。从 npm 页面点过来的人，看到的只是一排光秃秃的 tag，一个字都没有。

三件事因此做不到：

1. 想按版本读「这一版改了什么」的人，要自己去翻 `CHANGELOG.md`；
2. GitHub 上「只关注 release」这个订阅方式收不到任何通知 —— tag 不发通知；
3. 读 release 的工具（依赖检查、release 订阅源）看不到东西 —— 它们不读 tag。

`CHANGELOG.md` 里的文字已经是 release 说明该有的样子了。所以这不是「要写新内容」，
是「已经写好的内容没送到该去的地方」。

## 二、目标

**推 `v*` tag 发版本的时候，除了发 npm，同时在 GitHub 上自动建一个 release，
说明文字直接取自 `CHANGELOG.md` 里对应版本那一小节。**

不加新的 job，不加第三方 action，不引入任何依赖。

## 三、面谈定下来的六条（2026-08-22，用户逐条确认）

这六条是这个作业的地基。改任何一条都要走 CRD。

| # | 问题 | 定下来的答案 | 谁决定 |
| --- | --- | --- | --- |
| 1 | 要不要给已有的 17 个 tag 补 release？ | **不补。** 从 `0.10.0` 起自动生成。<br>**2026-08-22 有一处例外**：用户在 M1 评审时要求手工补了 `v0.9.0`（`CRD 0027`）—— 它是唯一一个既有 tag、又有完整 CHANGELOG 小节、又是当前最新版的版本。当初「8 个 tag 没有文字」那个理由对它不适用。**其余 16 个仍然不补。** | 用户 |
| 2 | CHANGELOG 里找不到这一版的小节，怎么办？ | **在 `npm publish` 之前就取文字，取不到整个 run 变红，什么都不发** | 用户 |
| 3 | 同一个 tag 重推一次，release 那步做什么？ | **只有 `publish=true` 才建 release**（`publish=false` 就跳过） | 用户 |
| 4 | 要不要给这条新规矩加 check？ | **要。** 加在 `tools/verify-mount.mjs` 里 | 用户 |
| 5 | 取文字的代码放哪？ | **直接写在 `publish.yml` 的 YAML 里**，不单独开 `tools/` 脚本 | 用户 |
| 6 | 那段 shell 怎么测？ | **不测。** 写进 `docs/qa/gaps.md` | 用户 |

### 第 1 条的理由和代价

17 个 tag 里只有 9 个在 `CHANGELOG.md` 里有小节（`0.4.0` 到 `0.9.0`）。
`v0.1.0` 到 `v0.3.0` 这 8 个一个字都没有，补出来只能是空页面。

**代价：** 其余 16 个 tag（`v0.1.0` 到 `v0.8.x`）在 GitHub 上没有 release 页面，也不打算补。
要补只能一次性手工敲命令。`v0.9.0` 是唯一的例外：用户在 M1 评审时要求手工补了它
（`CRD 0027`）。

### 第 3 条的理由和代价

**这一条用户听过代价之后仍然选了它，不是没想到。**

`Decide whether to publish` 那一步会先问 npm「这个版本在不在」。在的话设
`publish=false`，跳过 `npm publish`，run 保持绿色。`v0.7.0` 真的发生过这种事：那次 run
因为 shallow clone 红了，包没发出去。

**代价，写清楚：** 如果出现「npm 上有 `0.10.0`、GitHub 上没有 `v0.10.0` 的 release」这种
状态，**重新推 tag 补不回来** —— 那次 run 会跳过 publish，也就跳过建 release。
只能人手敲一次：

```sh
gh release create v0.10.0 --title v0.10.0 \
  --notes-file <(awk '/^## 0\.10\.0 /{f=1;next} f&&/^## /{exit} f' CHANGELOG.md)
```

（**不要用 `sed -n '/^## 0.10.0 /,/^## /p'`** —— `sed` 的区间两端都打印，做出来的说明
头上多一行 `## 0.10.0 — unreleased`、尾巴上多挂一行 `## 0.9.0 — 2026-08-22`。
文档评审 2026-08-22 抓到的，PM 跑过确认。上面这条 `awk` 跟 workflow 里那段逻辑一致。）

这条代价会同时写进 `docs/qa/gaps.md`，不靠这份 PRD 记着。

### 第 5、6 条的理由和代价

**这两条用户听过代价之后仍然选了它。** PM 建议过写成 `tools/changelog-notes.mjs`
（能写单元测试、能写 QA 用例、`npm test` 每次都跑得到），也建议过写一个 harness 把 YAML
里那段 `run:` 抠出来用 bash 真跑。两条都被否掉了，理由是简单。

**代价，写清楚：** 那段取文字的 shell **没有任何测试执行过它**。它要判断的边界情况包括：

- 小节标题找不到；
- 小节是空的；
- `0.1.0` 不能误匹配到 `0.10.0`（前缀重叠）；
- 最后一个小节后面没有下一个 `## ` 收尾；
- 标题里的破折号是 `—`（em dash），不是 `-`。

第一次真的验证它，就是第一次推 `v0.10.0` 的时候。**这不是疏忽，是选的。**
这条写进 `docs/qa/gaps.md`。

第 4 条那个 pin 能挡住的只有**步骤的位置和条件**（顺序、`if` 条件在不在），
挡不住 shell 里面的逻辑对不对。两者的差别在下面第七节写死了。

## 四、不在范围内

- **不补旧 tag 的 release**（第 1 条）。**`v0.9.0` 是唯一的例外**，手工补的，`CRD 0027`；其余 16 个不补。
- **不改发布流程本身**：仍然是 bump 版本 → commit → 推 `main` → 推 `v*` tag，只有 tag 触发
  `publish.yml`。这次不动它。
- **不真的发一个版本。** 这个作业只改机器，不推 tag、不发包。要不要发 `0.10.0` 是另一件事，
  要你另外说一次 yes。
- **不改 `test.yml`。**
- **不动 `docs/qa/gaps.md` 第 11 条那个洞**（pin 只认识 `npm publish` 一种说法，git guard
  认识七种）。它跟这次改的是同一块地方，但它在等一个决定，不是这次要修的东西。
- **不加第三方 GitHub Action。** 用 runner 自带的 `gh`。
- **不给 release 挂附件**（tarball 之类）。npm 上就有。
- **不做草稿（draft）和预发布（prerelease）标记。** `0.x` 也按正式版发，跟 npm 的
  `latest` 一致。

## 五、语言与技术栈（现成的，读出来的，不是选的）

这是个已经存在的仓库，栈就是它现在的样子：

| 项 | 是什么 | 从哪读到的 |
| --- | --- | --- |
| 语言 | Node.js，纯 ES modules（`"type": "module"`） | `package.json` |
| Node 版本 | 要求 `>=18`；这台机器 `v24.14.0`（我自己跑了 `node --version`） | `package.json` `engines` ＋ 实测 |
| 包管理器 | npm | `package.json` |
| 运行时依赖 | **零**。只有一个 `peerDependencies`：`@deepseek-ai/dsh-tool-subagent` | `package.json` |
| 测试框架 | 没有第三方框架。自己写的 `.mjs` 检查脚本 ＋ `docs/qa/lib/qa.mjs` | `tools/`、`docs/qa/` |
| **测试命令** | `npm test` —— 六段：`verify-guard` → `verify-jobs` → `verify-mount` → `verify-preset-install` → `bash docs/qa/run-all.sh` → `verify-tasks` | `package.json` `scripts.test` |
| lint / format | **没有** | `package.json` |
| CI | `.github/workflows/test.yml`（每次 push）、`.github/workflows/publish.yml`（只有 `v*` tag） | `.github/workflows/` |
| 发布方式 | npm trusted publishing（OIDC），没有 secret | `publish.yml` |
| 本地怎么跑 | `npm test`；单跑一项就直接调那个文件，例如 `node tools/verify-mount.mjs` | `CLAUDE.md` |

**没有选择，所以没有第二名。** 这次不加任何新依赖。

`gh` 命令行工具在 GitHub Actions 的 `ubuntu-latest` runner 上是自带的，不用装。
本机也有（`gh auth status` 显示已登录 `stuarthu`）。

## 六、这次作业的规模判断

**小型工作。** 两个代码任务，各改一个文件，两个文件不重叠。

- **不起 architect**，任务行由 PM 自己写进 `docs/design/tasks.md`；
- **不写 HLD** —— 六条决定已经把「怎么做」定完了，没有留给设计的空间；
- 一个里程碑 `M1`。

**你一句话就能改掉这个判断。** 如果你觉得该起 architect，说一声。

## 七、`publish.yml` 改成什么样（这一段是两个任务的共同契约）

`tools/verify-mount.mjs` 有一条现成的硬规定：**发布用的 workflow 只能有一个 job**
（`jobCount` 那一段，会数 `jobs:` 底下最浅一层的键）。所以新东西是**两个 step**，
加在现在那个 `publish` job 里面，不是新 job。

改完之后 `publish` job 的步骤顺序，从上到下：

| 位置 | 步骤 | 新/旧 | `if` 条件 |
| --- | --- | --- | --- |
| 1 | `actions/checkout@v7`（`fetch-depth: 0`） | 旧 | 无 |
| 2 | `actions/setup-node@v7` | 旧 | 无 |
| 3 | `Decide whether to publish`（`id: guard`） | 旧 | 无 |
| 4 | **`Read the release notes from CHANGELOG.md`（`id: notes`）** | **新** | **无 —— 每次都跑** |
| 5 | `Run checks`（`npm test`） | 旧 | 无 |
| 6 | `Ensure npm supports trusted publishing` | 旧 | `steps.guard.outputs.publish == 'true'` |
| 7 | `Publish`（`npm publish --provenance --access public`） | 旧 | `steps.guard.outputs.publish == 'true'` |
| 8 | **`Create the GitHub release`** | **新** | **`steps.guard.outputs.publish == 'true'`** |

**第 4 步为什么排在 `npm test` 前面而不是后面：** CHANGELOG 忘了写这一版的时候，
第 4 步大约 10 秒就红了，不用先等完整的测试套件跑完。它排在第 7 步前面才是要紧的
（第 2 条决定），排在第 5 步前面只是快一点。

**权限：** job 的 `permissions:` 要从

```yaml
permissions:
  contents: read
  id-token: write
```

改成 `contents: write`（`id-token: write` 保留）。`gh release create` 要写
`contents`。因为只能有一个 job，没有「把发布和建 release 拆成两个权限不同的 job」这条路。
这一点写在 `docs/decisions/adr/0026-contents-write-on-the-one-job.md` 里 —— 那份 ADR 把三个选项和它们输在哪都记下来了，因为这是里程碑评审时你可以推翻的那一类决定。

**这两个 step 的 `id` 和 `name` 是契约。** T-100 那个 pin 靠它们找到步骤。
改名字就要同时改 pin，两件事在同一个 commit 里。

### 第 4 步要做的事

1. 从 `package.json` 读 `version`（不从 tag 读 —— 第 3 步已经确认过两者一致，
   再读一次 tag 只是多一条会不一致的路）；
2. 在 `CHANGELOG.md` 里找**开头正好是** `## <version> ` 的那一行（版本号后面**必须有一个
   空格**，这样 `0.1.0` 不会匹配到 `## 0.10.0 — ...`）；
3. 从那一行的**下一行**开始，取到**下一个开头是 `## ` 的行为止**（不含），或者取到文件结尾；
4. 写进工作目录下的 `release-notes.md`；
5. **找不到那一行，或者取出来的内容去掉空行之后是空的 → 用 `::error::` 打一条能看懂的话，
   `exit 1`。** 不许降级成「自动生成说明」，不许绿着过去。

### 第 8 步要做的事

```sh
gh release create "$GITHUB_REF_NAME" \
  --title "$GITHUB_REF_NAME" \
  --notes-file release-notes.md
```

- 标题就是 tag 名（`v0.10.0`），跟 tag 一致，不另起花样；
- `GH_TOKEN` 用 `${{ secrets.GITHUB_TOKEN }}`（runner 自带，不用你去配）；
- **不加 `--draft`，不加 `--prerelease`，不加 `--generate-notes`。**
  `--generate-notes` 会从 commit 和 PR 自动编一段，那正是我们不要的东西。

## 八、里程碑

### M1 —— 推 tag 的时候自动建 release（唯一的里程碑）

**一句话目标：** 下次推 `v0.10.0`，GitHub 上自动多出一个 `v0.10.0` 的 release，
里面是 `CHANGELOG.md` 里 `0.10.0` 那一节的原文。

**你怎么试它：** 这个作业**不推 tag**，所以真正的验证要等下一次发版本。
在那之前你能试的是这三条命令，都在本机跑，都不碰网络：

```sh
npm test
node tools/verify-mount.mjs
bash docs/qa/run-all.sh
```

**M1 的 DoD**

| # | 怎么算做完 | 别人怎么验 |
| --- | --- | --- |
| 1 | `.github/workflows/publish.yml` 里有第七节表格中的 8 个步骤，顺序一致，`if` 条件一致。**pin 只判得了其中一部分** —— 两个新步骤相对 `npm publish` 的前后、它们的 `id` 和 `if`。它**不**判第 4 步排在 `npm test` 前面，也**不**判 checkout / setup-node / guard 三步的相对顺序（代码评审 M1 第 8 条报的：原来这一行的措辞比机器宽） | pin 判它那部分；**整张 8 步表由 `docs/qa/T-101/case-01` 逐行判** |
| 2 | job 的 `permissions` 是 `contents: write` ＋ `id-token: write`，仍然**只有一个 job** | `node tools/verify-mount.mjs` |
| 3 | `publish.yml` 仍然是 **tag-only**（有 `tags: ["v*"]`，没有 `branches:`），仍然在发布前跑 `npm test` —— 设计规矩第 7 条一个字没松 | `node tools/verify-mount.mjs` |
| 4 | `tools/verify-mount.mjs` 新增的 pin 能抓到四种坏改法（见 T-100 的 DoD） | T-100 的变异证明 ＋ QA 用例 |
| 5 | `docs/qa/gaps.md` 里有一条新条目，写明那段 shell 没有任何测试跑过它，并写明第 3 条决定留下的手工补救命令 | 人读 ＋ QA 用例判存在 |
| 6 | `npm test` 全绿，用例总数**不减** | 归 PM |
| 7 | `CLAUDE.md` 里 **`## The two planes` 上面**那段以 `Releases:` 开头的说明（含新加的两段），跟改完之后的真实流程一致 | 文档评审 |
| 8 | 两份 README 和 `CHANGELOG.md` 按第 14 步处理，改了就两份一起改 | 文档评审 |

**M1 不发版本。** 按第 13 步，它拿的是一份 `docs/release/` 下的「发布缺口清单」，不是发布计划。
**这里有个待决的小问题**：第 13 步给这个文件定的名字是 `<milestone>-gaps.md`，也就是
`docs/release/M1-gaps.md`。但这个仓库在 0.9.0 就因为「固定名字会被下一个作业悄悄覆盖」
把 `prd.md`、`hld.md` 改成了带日期和 slug 的名字。`M1-gaps.md` 是同一个毛病。
PM 会在第 13 步之前把这个问题单独拿给你决定，不在这里替你定。

## 九、任务（PM 写，因为小型工作不起 architect）

两个任务，**串行**，而且**先写 check、后改 workflow**。

| id | 做什么 | 拥有的文件 | 顺序 |
| --- | --- | --- | --- |
| `T-100` | 改 `tools/verify-mount.mjs`：加 pin，盯住第 4 步和第 8 步的位置与条件 | `tools/verify-mount.mjs` | **第一个** |
| `T-101` | 改 `publish.yml`：加第 4 步和第 8 步，改 `permissions` | `.github/workflows/publish.yml` | 第二个 |

**为什么 pin 先写（这就是这个作业的「先写失败的测试」）：** 第 5、6 条决定之后，
改 `publish.yml` 的那个任务**没有单元测试可写** —— 它改的是一份 YAML，而那段 shell
按第 6 条不测。所以它唯一的自动检查就是 T-100 那个 pin。

把顺序倒过来，测试先行就成立了：**T-100 写完，`npm test` 是红的**（pin 找不到那两个
步骤），这就是那份「先失败」的证据；**T-101 落地之后它变绿**，这就是「后通过」。
契约（步骤的 `id` 和 `name`）在第七节写死了，所以 T-100 不用等 T-101 就知道要找什么。

**为什么不并行：** 两个人在同一棵工作树里各自跑 `npm test`，会被对方写了一半的文件搞红，
然后去修一个不存在的缺陷 —— 这正是本仓库 `ADR 0022`
（`no-engineer-runs-npm-test-in-a-shared-tree`）记下来的那件事。

**M1 实际跑了六个任务，全部串行。** 上面那张表是开工时的计划。后来加的四个都写在
`docs/design/tasks.md` 里：`T-102`（补 `permissions` 的 pin —— PM 写 DoD 时漏的，
T-100 的工程师报回来的）、`T-103`（代码评审的阻塞发现：`- if:` 写在最前面时 pin 漏判）、
`T-104`（awk 退出码撞 mawk 自己的 2 ＋ `persist-credentials: false`）、
`T-105`（同一类洞的第五处：`- continue-on-error:` 写在最前面时测试门整个躲过 pin）。
**`T-100`／`T-102`／`T-103`／`T-105` 共用 `tools/verify-mount.mjs`，`T-101`／`T-104`
共用 `.github/workflows/publish.yml`** —— 靠**串行**避开冲突，不是靠分文件，
每一段任务行都写明了依赖和 `ADR 0022` 的理由。

**不属于任何任务的文件**（按 playbook 由 PM 自己写、自己单独 commit）：
`docs/qa/gaps.md`、这份 PRD、`docs/design/tasks.md`、ADR、CRD、`docs/release/M1-gaps.md`、
两份 README、`CHANGELOG.md`、`CLAUDE.md`。

## 十、分支

跟这个仓库前几个作业一样，**直接在 `main` 上做，不开 `crew/` 分支**
（`state.json` 里几个旧作业记的都是 `branch: main`）。

**推送、打 tag、发包，每一样都还要你单独说一次 yes**，一次 yes 不覆盖下一次。
这个作业默认**什么都不推**。

## 十一、风险

| 风险 | 会怎样 | 怎么处理 |
| --- | --- | --- |
| 那段 shell 有 bug，没人测过（第 6 条） | 第一次推 `v0.10.0` 的时候，run 红了或者 release 文字是错的 | 已知并接受。`npm publish` 排在取文字后面，所以最坏情况是**没发出去**，不是发错了 |
| `contents: write` 把整个 job 的权限放宽了 | `npm publish` 那一步也带着写权限跑 | 只能一个 job，没有别的路。安全评审会看这一条 |
| pin 写得太死，以后正当的改动被误判红 | 有人重排步骤就被拦，即使改动是对的 | pin 只判「位置关系」和「`if` 条件在不在」，不判具体文字。误红的规矩会让人不再读它 —— 这是 `verify-mount.mjs` 里 T-46 那段注释的原话 |
| `gh` 在 runner 上不存在 | 第 8 步失败，但包已经发出去了 | `ubuntu-latest` 自带 `gh`。真出事的话 run 是红的，你会看到，手工补一次 |

## 十二、还没定的事

1. `docs/release/M1-gaps.md` 这个固定名字的问题（第八节末尾）。PM 会在第 13 步前单独问你。
2. 这个作业做完之后要不要马上发 `0.10.0`。**默认不发。**
