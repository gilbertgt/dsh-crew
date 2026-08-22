# `actions/checkout` 的 `persist-credentials` 默认值

**一句话答案：v4、v5、v6、v7 的默认值全都是 `true`。这个默认值从来没有改过。**
想把它改成 `false` 的那个 PR（#1687）到今天（2026-08-22）还是 open，没有合并。

**但是安全评审那条理由里的一半是过时的。** 从 **v6.0.0**（2025-11-20）开始，token
的值**不再写进 `.git/config`**，而是写进 `$RUNNER_TEMP` 下一个随机命名的
`git-credentials-<uuid>.config` 文件，`.git/config` 里只留一条 `include.path`
指过去。所以：

- 「默认是 `true`」→ 对，v7 也是 `true`。
- 「会写进 `.git/config` 的 `http.https://github.com/.extraheader`」→ 对 v4/v5 是对的，
  **对 v6/v7 是错的**。v7 里那一行在 `$RUNNER_TEMP` 的另一个文件里。
- 「整个 job 都留在磁盘上」→ **仍然对**。换了个地方存，不等于没存；同一个 job 里后面的
  步骤、以及这个 job 里跑的任何第三方 action 或 npm 包，照样能读到并用它推东西。

也就是说，**这条建议不是多余的**，只是它给出的文件路径要改。要不要采纳，是 PM 的决定，
不是我的。

---

## 问题一：v4 / v5 / v6 / v7 各版本的默认值

| 大版本 | `persist-credentials` 默认值 | token 存在哪里 | 出处 |
| --- | --- | --- | --- |
| v4 | `true` | `.git/config` 的 `http.<server>/.extraheader` | [v4 `action.yml`](https://raw.githubusercontent.com/actions/checkout/v4/action.yml) |
| v5 | `true` | 同上 | [v5 `action.yml`](https://raw.githubusercontent.com/actions/checkout/v5/action.yml) |
| v6 | `true` | `$RUNNER_TEMP/git-credentials-<uuid>.config`，`.git/config` 用 `include.path` 引入 | [v6 `action.yml`](https://raw.githubusercontent.com/actions/checkout/v6/action.yml)、[v7 README 的 "What's new · Checkout v6"](https://raw.githubusercontent.com/actions/checkout/v7/README.md) |
| v7 | `true` | 同 v6 | [v7 `action.yml`](https://raw.githubusercontent.com/actions/checkout/v7/action.yml) |

四个 tag 的 `action.yml` 里，这一段的文字完全一样：

```yaml
persist-credentials:
  description: 'Whether to configure the token or SSH key with the local git config'
  default: true
```

v7 的 `README.md` 的 Usage 输入表也写着：

```
# Whether to configure the token or SSH key with the local git config
# Default: true
persist-credentials: ''
```

- 出处：<https://raw.githubusercontent.com/actions/checkout/v7/action.yml>、
  <https://raw.githubusercontent.com/actions/checkout/v7/README.md>
- 读到日期：2026-08-22
- 把握：`certain`（四个 tag 的 `action.yml` 各读了一次，README 的输入表另外证实了一次）

### 「改过默认值」这件事：有人提过，但没合进去

- PR [#1687 "Change the default value of persist-credentials to false"](https://github.com/actions/checkout/pull/1687)
  今天读的时候状态是 **Open**，没有合并。作者的留言是
  “i'd like to get this shipped in the next major release.”，但没说是哪个版本。
  它对应的是 issue [#485](https://github.com/actions/checkout/issues/485)。
- 读到日期：2026-08-22。把握：`likely`（页面状态是 open，但 GitHub 的 PR 页面靠 JS
  加载，抓下来的内容不完整；`action.yml` 那四个 `default: true` 才是硬证据，
  而且它们已经足够证明「没改过」）。

### v6 真正改的是什么

v7 的 README 的 "What's new" 里，v6 那一节原文两句：

> "Improved credential security: `persist-credentials` now stores credentials in a
> separate file under `$RUNNER_TEMP` instead of directly in `.git/config`"
>
> "No workflow changes required — `git fetch`, `git push`, etc. continue to work automatically"

源码也对得上。`src/git-auth-helper.ts`（v7 tag）里：

```
const configFileName = `git-credentials-${randomUUID()}.config`
this.credentialsConfigPath = path.join(runnerTemp, configFileName)
```

```
this.tokenConfigKey = `http.${serverUrl.origin}/.extraheader`
```

`extraheader` 这个 key 还在，但它现在被写进上面那个 `$RUNNER_TEMP` 里的文件，
`.git/config` 只放一条 `include.path` 指向它。

- 出处：<https://raw.githubusercontent.com/actions/checkout/v7/src/git-auth-helper.ts>、
  <https://raw.githubusercontent.com/actions/checkout/v7/README.md>、
  PR [#2286 "Persist creds to a separate file"](https://github.com/actions/checkout/pull/2286)（v6.0.0 的改动）
- 读到日期：2026-08-22
- 把握：`certain`（README、CHANGELOG、源码三处一致）

这个改法有已知的副作用，和本仓库无关但值得知道：`includeIf` 的路径是写死的 GitHub
路径，所以在 Forgejo/Gitea 这类非 GitHub runner 上会认证失败
（[issue #2321](https://github.com/actions/checkout/issues/2321)），在 Docker container
action 里要 Actions Runner ≥ v2.329.0
（[issue #2359](https://github.com/actions/checkout/issues/2359)）。
读到日期：2026-08-22，把握：`likely`（来自搜索摘要和 issue 标题，没有逐页读完）。

---

## 顺带问题 1：`actions/checkout@v7` 是真实版本吗

**是。** Release 列表里有 v7.0.0（2026-06-18）和 v7.0.1（2026-07-20）。

各版本的发布日期（用 GitHub API 读的，带年份）：

| tag | 发布日期 |
| --- | --- |
| v7.0.1 | 2026-07-20 |
| v7.0.0 | 2026-06-18 |
| v6.1.0 | 2026-07-20 |
| v6.0.3 | 2026-06-02 |
| v6.0.0 | 2025-11-20 |
| v5.1.0 | 2026-07-20 |
| v5.0.0 | 2025-08-11 |
| v4.4.0 | 2026-07-20 |
| v4.0.0 | 2023-10-17 |

v7.0.0 的主题不是凭据，是 fork PR 的安全：README 的 "What's new · Checkout v7" 说
“checkout now refuses to check out fork pull request code by default when the workflow
is triggered by `pull_request_target` or `workflow_run`”，并加了一个新输入
`allow-unsafe-pr-checkout`。同一条改动在 2026-07-20 那批 release 里被 backport 回
v6.1.0 / v5.1.0 / v4.4.0 / v3.7.0 / v2.8.0。

- 出处：<https://api.github.com/repos/actions/checkout/releases?per_page=30>、
  <https://github.com/actions/checkout/releases>、
  <https://raw.githubusercontent.com/actions/checkout/v7/README.md>
- 读到日期：2026-08-22
- 把握：`certain`

---

## 顺带问题 2：设了 `persist-credentials: false` 之后怎么 push

**官方文档没有给这个做法。** 默认既然还是 `true`，README 也就没有写「关掉之后怎么办」
的配方。

我确认过的两点：

1. v7 README 的 "Push a commit using the built-in token" 例子**用的是默认值**，
   里面没有 `persist-credentials`，直接 `git push`：

   ```yaml
   - uses: actions/checkout@v7
   - run: |
       date > generated.txt
       git config user.name "github-actions[bot]"
       git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
       git add .
       git commit -m "generated"
       git push
   ```

2. README 里没有任何一句讲「设成 `false` 之后，后面的步骤要怎么做认证 git 命令」。

所以对这个小问题，答案是 `unknown`（官方无建议）。业界常见做法是在 push 的那一步自己
带 token（例如 `git push https://x-access-token:$GITHUB_TOKEN@github.com/...`），
但这不是 `actions/checkout` 文档说的，我没有找到官方出处，所以不写成结论。

- 出处：<https://raw.githubusercontent.com/actions/checkout/v7/README.md>
- 读到日期：2026-08-22
- 把握：`certain`（「文档没写」这一点是确定的）；具体替代做法 `unknown`

---

## 对本仓库的事实（不含建议）

`/home/stuart/workspace/dsh-crew/.github/workflows/publish.yml` 第 45 行是
`uses: actions/checkout@v7`，`with:` 里只有 `fetch-depth: 0`，没有
`persist-credentials`（读到日期：2026-08-22，把握：`certain`）。

这个 job 的 `permissions` 是 `contents: write` + `id-token: write`（第 42–43 行），
最后一步 `gh release create` 用的是 `secrets.GITHUB_TOKEN` 走环境变量 `GH_TOKEN`
（第 179–186 行），**不是**走 git 的持久化凭据。整个 workflow 里没有任何一步跑
`git push`。

`.github/workflows/test.yml` 我没有读，它是否也用 checkout、是否需要凭据，`unknown`。

---

## 我查了但没有用上的东西

- `https://github.com/actions/checkout/releases/tag/v7.0.0` 和
  `.../v6.0.0`：GitHub 的 release 页面靠 JS 加载，抓下来一堆
  "Uh oh! There was an error while loading"，正文不全。日期最后是用 API 拿的。
- `https://github.com/actions/checkout/pull/1687`：同样只拿到部分内容，只能确认
  状态是 open，拿不到「合并到哪个版本」这种细节（因为它根本没合并）。
- `v7/CHANGELOG.md`：条目太简短（只有 "Persist creds to a separate file" 这类一行），
  没有日期，比 README 的 "What's new" 差，所以只用来交叉验证。
- 一篇第三方文章 `masteringlaravel.io/daily/2026-06-18-...`（标题是
  "The security default we change in GitHub's checkout action"）出现在搜索结果里，
  我**没有**打开它，也没有引用它 —— 官方仓库的 `action.yml` 已经直接回答了问题。

## 需要 PM 跑的命令

没有。这个问题全部靠读文件和网页就答完了。
