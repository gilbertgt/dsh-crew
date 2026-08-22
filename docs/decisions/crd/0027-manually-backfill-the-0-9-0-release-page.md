# CRD 0027：手工补一个 `v0.9.0` 的 release 页面

- **状态**：**accepted**（用户，2026-08-22）
- **谁写的**：PM
- **谁提的**：**用户**，2026-08-22，原话 `I want you to manually create 0.9.0 release page for now`
- **作业**：`gh-release`，M1 评审时

## 想要什么

现在就用手工命令给 `v0.9.0` 这个已经存在的 tag 建一个 GitHub release 页面，
不等 `0.10.0`。

## 为什么这是一次范围改动

面谈第 1 条（`docs/design/prd-2026-08-22-gh-release.md` 第三节）定的是：

> **不补。** 从 `0.10.0` 起自动生成

理由是 17 个 tag 里有 8 个在 `CHANGELOG.md` 里连一段文字都没有，补出来只能是空页面。
「不在范围内」那一节也写着「**不补旧 tag 的 release**（第 1 条）」。

**用户现在要补其中一个。** 所以这不是一次问答，是改一条已经写进 PRD、已经被确认过的决定。

## 理由

用户没有给理由，PM 也没有问 —— 这一条不需要理由就成立：
`0.9.0` 是**唯一**一个既有 tag、又在 `CHANGELOG.md` 里有完整一节、
而且是当前最新版的。当初「不补」的理由（8 个 tag 没有文字）**对它不适用**。
补它，等于用手工做出这套机器以后会自动做出来的那种页面，提前给人看一眼。
**做出来的是页面，不是证据。**

## 它碰到什么

| 文件 | 改什么 |
| --- | --- |
| `docs/design/prd-2026-08-22-gh-release.md` 第一节 | 「0 个 GitHub release」→ 1 个 |
| 同上 第三节第 1 条那一行 | 加一条例外 |
| 同上 第三节「第 1 条的理由和代价」 | 「永远没有 release 页面」→ 其余 16 个没有，`v0.9.0` 例外 |
| 同上 第四节「不在范围内」 | 同上 |
| `CLAUDE.md` | 「`v0.1.0` 到 `v0.9.0` 都没有 release 页、也不会有」→ `v0.9.0` 有了 |
| `CHANGELOG.md` `## 0.10.0` 那一节 | 「Old tags are not getting release pages」→ 同上 |
| `docs/release/2026-08-22-gh-release-M1-gaps.md` | 记下这次手工动作 |

**没有碰任何代码。** `.github/workflows/publish.yml` 和 `tools/verify-mount.mjs` 一个字节没动。

## 代价

**几乎为零，而且是一次性的。**

- 不用改代码，不用重跑任何任务；
- **没有推 tag**：`v0.9.0` 已经存在，`gh release create --verify-tag` 用的是现成的 tag，
  所以 `publish.yml` **没有被触发**，没有发任何包。事后核过：远端仍然是 17 个 tag。
- 唯一的代价是上面那张表里的文档要跟着改，否则它们说的是假话。

**它没有验证这次作业做的机器。** 这是手工敲的命令，跟 workflow 里那两个步骤走的不是同一条路
—— 唯一共用的是那条 `awk` 的逻辑。`docs/qa/gaps.md` 第 54 条那句
「第一次真的验证它，是第一次推 `v0.10.0` 的时候」**仍然成立**。

## 决定

**accepted**，用户 2026-08-22 直接要求。

## 加了哪些 DoD 项

**没有加。** 这次改动没有产生新的可验收工作 —— 动作已经做完，剩下的是把六处文档改准，
那属于第 14 步（读者能看到的文件），不是新任务。

## 做了什么（实证）

```sh
awk '/^## 0\.9\.0 /{f=1;next} f&&/^## /{exit} f' CHANGELOG.md > notes-0.9.0.md   # 173 行，0 个 `## ` 标题行
gh release create v0.9.0 --title v0.9.0 --notes-file notes-0.9.0.md --verify-tag
```

用的就是这次写进 `docs/qa/gaps.md` 第 54 条和 PRD 第三节的那条 `awk`
（**不是 `sed`** —— `sed` 的区间两端都打印，会多带两行标题，文档评审 2026-08-22 抓到的）。

**结果**：<https://github.com/stuarthu/dsh-crew/releases/tag/v0.9.0>，标为 Latest，
不是草稿、不是预发布，正文 173 行。跟本地那份逐字节比对只差
GitHub 自己把行尾存成 CRLF、末尾多一个空行 —— 内容相同。
远端 tag 数仍然是 **17**。

**别人怎么复核**（这几条读远端，不改任何东西）：

```sh
gh release view v0.9.0 --json isDraft,isPrerelease,isLatest,body
git ls-remote --tags origin | wc -l
```

## Applied

- `docs/design/prd-2026-08-22-gh-release.md` → v7
- `CLAUDE.md`、`CHANGELOG.md`、`docs/release/2026-08-22-gh-release-M1-gaps.md` → 已改
