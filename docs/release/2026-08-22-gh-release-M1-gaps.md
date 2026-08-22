# 发布缺口清单：`gh-release` 作业 M1

- **日期**：2026-08-22
- **里程碑**：M1（`gh-release` 作业唯一的里程碑）
- **状态**：**不发布**

## 为什么这个文件叫这个名字

流程给这个文件定的名字是 `<里程碑>-gaps.md`，也就是 `M1-gaps.md`。**PM 没有用那个名字。**
`M1` 是每个作业都会用的里程碑号，固定名字意味着下一个作业的 M1 会悄悄覆盖这一份，
而且没有任何检查会红。这个仓库在 0.9.0 已经因为同样的原因把 `prd.md`、`hld.md`
改成了带日期和作业名的名字（`docs/design/prd-2026-08-21-apply-req.md` 那一批）。
**这里沿用同一条规矩**：`<日期>-<作业名>-<里程碑>-gaps.md`。

## 这个里程碑不发布

它改的是**发布机器本身**，不是用户装的东西。`package.json` 仍然是 `0.9.0`，
`CHANGELOG.md` 顶上那一节仍然标着 `## 0.10.0 — unreleased`。
**没有推过任何东西**：没有 push、没有 tag、没有 `npm publish`、没有 `gh release create`。

## 要发 `0.10.0` 之前还缺什么

### 1. 这次改的机器，第一次真的被验证就是那一次推 tag

这是最要紧的一条，也是绕不过去的一条。

`.github/workflows/publish.yml` 新加的两个步骤，**没有任何测试执行过它们**：

- 那段取 `CHANGELOG.md` 文字的 awk —— `docs/qa/gaps.md` 第 54 条，
  用户 2026-08-22 面谈第 5、6 条明确选的「不测」；
- `gh release create` 那一步 —— 本机跑不了，要真的有一个 tag、一个 runner、
  一个 `GITHUB_TOKEN`；
- `persist-credentials: false` —— 同样要一次真的 run（`docs/qa/gaps.md` 第 55 条）。

**能做的都做了**：工程师把那段 shell 从 YAML 里抠出来、用 GitHub 的默认 shell
（`bash --noprofile --norc -eo pipefail`）在本机 mawk 上跑过八段手工证据
（正常取、前缀重叠、找不到、空小节、文件不见了、最后一节）。**那是证据，不是测试** ——
不进任何套件，下次没人会再跑。

**所以发 `0.10.0` 的时候要盯着看**，而不是推完就走。

### 2. 发布配方本身刚被改过，也还没被走过一遍

`CLAUDE.md` 的 `Releases:` 那一段这次重写了 —— 文档评审发现**照旧配方做会红**：
它漏了「把 `— unreleased` 换成日期」这一步，而 `docs/qa/T-81/case-01` 判的正是这个，
`npm test` 又跑在 tag 自己那次 run 里面。新配方是：

1. `CHANGELOG.md` 顶上那节的 `— unreleased` 换成日期；
2. `package.json` 的 `version` 改成 `0.10.0`；
3. commit，推 `main`；
4. **等 CI 绿**；
5. 推 `v0.10.0` tag；
6. **打开 GitHub 的 Releases 页面读一眼**，确认文字真的是 `CHANGELOG.md` 那一节。

**第 6 步没有任何机器替你做。**

### 3. 一个补不回来的状态，要知道它存在

面谈第 3 条：只有 `publish=true` 才建 release。所以一旦出现
「npm 上已经有 `0.10.0`、GitHub 上却没有 release」，**重推 tag 补不回来**。
唯一的出路是人手敲一次，命令在 `docs/qa/gaps.md` 第 54 条里（用 `awk`，**不要用 `sed`**）。

### 4. 三条已知的、这次没修的洞

都在 `docs/qa/gaps.md`，都是**已知且刻意**：

| 条目 | 是什么 | 谁在等 |
| --- | --- | --- |
| 55 | `contents: write` 授给整个 job，`npm publish` 也带着跑；`write-all` 不被拦；`persist-credentials: false` 没人守 | `ADR 0026`，用户可推翻 |
| 56 | 步骤键表还差两个键，同一类洞可能有第六处 | 没人在写那两个键之前是死的 |
| 57 | 发布门还有三个入口能绕过去，最宽的一个是**一个词**（`always()`） | **等用户决定要不要开任务** |

**第 57 条那条 A 是安全评审唯一建议现在做的一条。** PM 没有开任务，
因为它跟「建 GitHub release」无关、是这次改动之前就在的，而 M1 已经从 2 个任务长到 6 个。

### 5. 一条 pre-existing 的供应链收窄，也在等决定

`publish.yml` 的 `npm install -g npm@latest` 没有钉版本。它是这个 job 里**唯一**一步
从网络下载并执行第三方代码，跑在 `npm publish` 之前，而那时候 OIDC 那两个环境变量
就在它的 `process.env` 里。安全评审建议收窄，同时说清楚**钉版本也只是收窄不是关闭**。

## 已经就绪的

- `npm test` **exit 0**，35 个任务 35 个通过（本作业新增 25 条用例、210 条断言）；
- 三个评审全部 pass：代码 4 轮、安全 3 轮、文档 3 轮；
- `gh auth status` 已登录 `stuarthu`；npm 走 trusted publishing（OIDC），**没有 secret 要配**；
- `CHANGELOG.md` 的 `## 0.10.0` 一节已经写好，四条 bullet，含两个代价。

## 下一个里程碑要做的

**改这个文件，把上面的条目划掉，不要重写一份。** 这是发布计划的第一稿。
