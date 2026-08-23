# CRD 0028：三段权威原文在四个工程师已经抄完之后被收紧

- **状态**：**accepted**（PM，2026-08-22）
- **谁写的**：PM
- **谁提的**：**安全评审**（3 条）和**文档评审**（1 条），`skip-and-split` 作业 M1
- **作业**：`skip-and-split`，M1

## 为什么这是一次契约改动

`docs/design/tasks.md` 里那三段权威原文（A／B／C）被这个作业**明写为契约**：

> 这三段是本作业的**契约**。四个任务并行开工、互相看不见，所以措辞由这里定死，
> 不由任何一个工程师定。

四个工程师照它抄完、交工之后，评审报了四条发现，**三段全部被改**。改的是四个已完成任务
所依赖的那份东西，所以它不是「一次评审发现」那么简单——**它是把已经交付的活的地基换掉了**，
四个任务全部返工一轮。

`docs/qa/gaps.md` 第 59 条正好写着这件事的另一半：用例守得住「几份拷贝有没有漂」，
守不住「原文本身被改了」。原文和抄件一起改，**17 条用例一条都没红**。
没有这份 CRD，这次改动在仓库里就只剩提交信息。

## 改了什么，三段各一条

**原文 A —— 收紧「能跳」的判定**（安全评审第 4 条）。

旧写法用破折号把两句连成一个意思：`only when you can start the work without its answer —
the answer does not change what is being built`。它们不等价，**弱的那个在前面**。
评审给的实例：「这个里程碑要不要发到 npm？」不回答完全能开工，按旧写法可以跳——
然后「发不发」变成 PM 一个人事后决定的。

新标准是后半句：`only when its answer changes neither what gets built nor what gets released`，
并明写 `being able to start the work without the answer is not enough on its own`。

**原文 B —— 用户答过的「不要」永远不许丢**（安全评审第 2 条，**这一条最重**）。

旧规则只管「用户**选了「先不定」**」的问题，没管「用户**答了「不要」**」。
评审给的利用路径是完整的：一个照着规则做事的 PM，可以把用户明确说过的「不要」
抹得一个字不剩——「不在范围内」不许写（删个文件撤得回来、不用重做活），
而 `principles.md` 里那段理由又把面谈表那一行也判成了错的。作业目录一丢，那个「不要」
就彻底消失了。

新加的一句：`A question the user answered goes into the table of what the interview settled,
and a "no" is an answer.` 加上 `you may never drop a refusal the user actually gave`。

**原文 C —— 「真代价」加上第三种**（安全评审第 3 条）。

旧标准只有两种（重做已完成的活、不可撤销）。评审指出：「本次不改 `host/git-guard.js`」
按字面**不符合任何一条**——改它撤得回来，也不用重做活——所以**不许**进「不在范围内」。
下一个里程碑就能动这个包最主要的安全防线，纸面上没越过任何边界。

本作业自己的 PRD 留住这一条，靠的是「三组用例要重核」这个附带理由，
**不是因为规则保护了它**。护栏是碰巧有的，不是写下来的。

新加：`or it would weaken a safety guard or a permission rule`。

## 第四条发现，不改原文

文档评审报的：两份 README、`CLAUDE.md`、`principles.md` 都向用户承诺
「跳过的东西以后想要不用写 CRD」，**唯独 `roles/pm.md` 没写**——而那是 PM 照着干活的文件。
同时那句承诺**没有限定条件**，跟同一节前面「动里程碑清单要写 CRD 并问用户」直接打架。

两半都修了：`roles/pm.md` 补上那一句，四处转述统统加上限定——
**不写 CRD 只是因为没有已确认的话被推翻；动到里程碑清单、DoD 或范围时第 14 条照旧适用。**

## 它碰到什么

| 文件 | 改什么 |
| --- | --- |
| `docs/design/tasks.md` | 三段权威原文（中英各一份）；四个任务各加 DoD 条目；新增 T-110 |
| `roles/pm.md` | 三段原文换新版；`Not a change request` 清单补一句 |
| `principles.md` | 三段原文换新版；`CRD 0027` 那段理由重写；穷尽式判断那句补全 |
| `README.md`、`README-zh.md` | 转述跟上，并加限定 |
| `CLAUDE.md` | 同上 |
| `CHANGELOG.md` | T-110 新写的 `### Changed` 一节 |
| `docs/qa/T-106`、`T-107`、`T-110` | 用例跟着改和新增 |

## 代价

**四个任务返工一轮。**没有任何东西被推翻重做——原文是**收紧**，不是改方向——
所以四个工程师改的是同几段文字，不是重写整个任务。加上 T-110 一个新任务。

**它没有花掉用户的时间**：M1 还没交付，这一轮全部发生在里程碑评审之前。

## 决定

**accepted，PM 决定。** 按 `principles.md` 第 14 条，用户看不见差别的契约修补是 PM 的活，
在里程碑汇报里说一声——这份 CRD 就是那个「说一声」的书面版。

**用户可以在 M1 评审上推翻它。**推翻的话，四个任务再返工一轮。

## 加了哪些 DoD 项

**加了 5 条。** T-106 加 1 条（第 6 格），T-107 加 2 条（第 6、7 格），
T-108 加 1 条（第 6 格），T-109 加 1 条（第 5 格）。条目原文写在
`docs/design/tasks.md` 各自的任务行里，不在这份 CRD 里。
另加整个 **T-110**（7 条 DoD），那是文档评审报的第 6 条 blocking。

## Applied

- `docs/design/tasks.md`、`roles/pm.md`、`principles.md`、`README.md`、`README-zh.md`、
  `CLAUDE.md`、`CHANGELOG.md` → 已改
- `docs/design/prd-2026-08-22-skip-and-split.md` → **不变**，v1。
  PRD 定的是「面谈加『先不定』、『不在范围内』只装真边界」这两件事，这次改的是它们的措辞，
  不是它们本身。
