# ADR 0025：`write-all` 的处理 —— 改那句话，不改判它红

- **状态**：accepted
- **日期**：2026-08-22
- **决定人**：**PM**（`gh-release` 作业，M1）
- **作业**：`gh-release`，任务 `T-103` 的 DoD 第 6 条

## 在决定什么

`tools/verify-mount.mjs` 里 T-102 那条 pin 判发布用 workflow 的 job 有没有
`contents: write` 和 `id-token: write`。`permissions: write-all` 这种写法确实两个都给了，
所以 pin 放行，并打出这样一句绿：

> the job that publishes is granted `contents: write` … and `id-token: write`

**这句话在 `write-all` 的情况下是假的** —— 实际授的是全部 scope，包括 `packages: write`
和 `actions: write`。安全评审在 M1 那一轮报了它，并给了两个选项：**要么 `fail()`，
要么把 `ok()` 改成如实说**。

T-103 的 DoD 第 6 条把这两个选项原样写给了工程师。**这份 ADR 替它选一个**，
因为工程师正在做，而两个选项会走向不同的结果。

## 选项，以及为什么另一个输了

### 选项 A（**选中**）：把那句 `ok` 改成实话，`write-all` 仍然放行

`ok` 要如实说「这个文件授的是 `write-all`，本 pin 没有逐个 scope 读」。

- **代价**：`write-all` 仍然过得去。一个跑 `npm publish` 和 `npm install -g` 的 job
  用 `write-all`，安全评审说得很直白：**不可接受**。这条 pin 仍然不会拦它。
- **为什么还是选它**：
  1. **`write-all` 是合法 YAML，GitHub 照收，而且它真的给了这两个 scope。**
     这条 pin 问的问题是「这两个 grant 在不在」，`write-all` 的答案是「在」。
     判它红，就是这条 pin 开始回答一个它没被派去回答的问题。
  2. **本仓库房规：会把正确文件报红的门，会教人不再读它**
     （`tools/verify-mount.mjs` 里 T-46 那段注释）。
  3. **QA 在 M1 那一轮已经把 `write-all` 写进「六种正当写法必须保持绿」那条用例**
     （`docs/qa/T-102/case-05`）。选 B 就要同时改 QA 的用例 —— 而那是被判的一方
     改考题的形状，即使这次是 PM 让它改的。
  4. **「授得太多」这件事没有丢**：`docs/qa/gaps.md` 第 55 条已经写下来了，
     写明没有任何用例判得了「权限是不是最小的」。缺口有名字，比一条半对的 pin 好。

### 选项 B（**没选**）：`write-all` 直接 `fail()`

- **好处**：真的拦住一种不可接受的写法。安全评审会更满意。
- **为什么输**：它是在**新加一条规矩** —— 「发布 workflow 不许用 `write-all`」。
  没有人要求过这条规矩，也没有任何一次真实事故推动它；这次改动里 `write-all`
  一次都没出现过。按本仓库的做法，新规矩要么由用户提（CRD），要么由一次
  真实失败推动。**顺手在一个修 bug 的任务里塞一条新规矩，是这次不该做的事。**
  它还会连带改 QA 的用例，把一个两行的修补变成跨两个所有者的改动。

### 选项 C（**没选**）：逐个 scope 读，多给的 scope 一律报红

- **为什么输**：那是「最小权限检查器」，是另一件产品。要定义哪些 scope 算多、
  要处理 workflow 级和 job 级的覆盖、要处理 `write-all` 和 `read-all`。
  代价远超这次的收益，而且同样是一条没人要求过的新规矩。

## 决定

**选项 A。** 把 `ok` 改成实话，`write-all` 仍然放行。

`docs/qa/T-102/case-05` 一个字都不用改，它对 `write-all` 保持绿的断言仍然成立。

## 这条决定没有关掉的事

**`write-all` 仍然过得去，这条 pin 仍然不拦它。** 那是 `docs/qa/gaps.md` 第 55 条，
未关闭、刻意的。哪天用户想要「发布 workflow 不许 `write-all`」这条规矩，
那是一次 scope 改动，走 CRD，不在这个作业里。
