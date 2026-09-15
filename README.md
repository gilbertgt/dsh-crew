# dsh-crew

> **Version 0.10.0 (next release: 0.11.0).**

dsh-crew is a plugin for DeepSeek Harness (dsh). It turns your dsh session into a
product manager (PM) that runs a flat crew of direct child roles: architect,
engineer, test engineer, code engineer, QA, code reviewer, security reviewer, doc
reviewer, and researcher.

## What it is

You talk only to the PM. The crew stays flat, but the PM starts a child role only
when that role adds relevant skill or independent evidence. The nine roles, model
routing, Git guard, PM write guard, permissions and resume support stay in place.

Two lanes, then a route:

- `ask` — you want an answer. The PM answers. Nothing changes.
- `team` — you want a change. Inside it the PM picks the cheapest route that can
  carry the work: `direct` for a small, low-risk change, done by the PM with no
  child role; `solo` for ordinary coding, which is one engineer and nobody else;
  and `crew` only for work that is large, cross-module, high-risk or
  architecture-changing, where the relevant roles are started and no others.

Whether a security review is needed is a separate question, answered from a
closed list. A settings page, form or dropdown is `solo` even though it takes
input; a change that also touches a login or a permission check stays `solo` and
adds one security reviewer.

Development runs targeted tests. The full project and QA gates run once when the
change is ready, then again only after a failure requires a fix. Completed stages
are checkpointed and are not repeated after resume. Pushing and publishing still
need a user's own yes, every time.

## Install

```sh
dsh plugin --profile tui add dsh-crew     # or --profile web
```

Restart dsh. Pick the **Crew** preset for a session. The Web profile also loads the
native **Crew** Settings section when the host serves its settings namespace.

## Quick start

1. Install the plugin.
2. Restart dsh.
3. Start a session on the **Crew** preset. Your session becomes the PM.
4. Ask a question, ask for a change, or open **Settings → Crew** in DSH Web to configure
   child-role model routes.

## Crew Settings in DSH Web

The **Crew role model settings** page is the standalone **Settings → Crew** section. Its
settings are backed by the stable `dsh-crew-roles` namespace.
It shows the host model catalog's current PM/root default and one row for each of
the nine child roles. Each row can inherit the PM/session route or choose its own
Provider, Model and Reasoning Effort.

Provider, Model and reasoning choices come from DSH's live model catalog. The UI
never hardcodes a provider, model, or capability table. If a saved identifier is no
longer in the catalog, it remains visible and marked unavailable; it is not silently
deleted. Exact route and reasoning validation remains DSH's host preflight before a
child starts.

A role route is sent only when it has a non-empty Model. Its `provider`, `model`, and
`reasoningEffort` fields are child `AgentOptions` values. Reasoning Effort is omitted
when the role inherits its route or has no route-owned effort. If the catalog does not
advertise reasoning choices, the UI does not invent them; a previously saved effort stays
visible and the DSH host preflight remains authoritative. Changing Provider or Model clears
the route-owned effort so an old capability cannot leak into a new route.

Save and discard are explicit. Saves use the settings document revision; when another
writer changes the document, the Crew page keeps the draft and reports a conflict instead
of overwriting it. A read-only settings scope is reported as such. If the official Web settings
scope is unavailable, the section does not invent local persistence.

## Configuration and compatibility

Crew Settings overrides are optional. Precedence for role model routes is:

1. schema defaults;
2. the legacy `roleModels` composition value in the shipped crew preset;
3. the user layer from the `dsh-crew-roles` Web Settings namespace.

The namespace is stable, but persistence is host-dependent: when DSH provides a durable
settings backend the user layer survives restart; a process-local or unavailable scope does
not promise that. The page never substitutes localStorage or writes the production preset.

The legacy `roleModels` value remains supported for older profiles and non-Web
compositions. `roleAllow` and `roleDeny` remain in the installed preset for tool
filters. Resetting a Web override removes only that user-layer role key; a legacy
preset route may then become visible again.

The preset installer changes only a stamped preset written by dsh-crew. It keeps
edited or added preset files as `.bak` during a refresh, carries earlier `.bak` files
forward without creating `.bak.bak`, and names them in the boot log. When there is
anything to preserve it also writes a durable pre-upgrade archive beside the preset
folder (a clean refresh writes none). The settings document is outside that preset
folder, so it is not removed by a preset refresh. The source package keeps its released
`0.10.0` version until the `0.11.0` release; a shipped-preset revision stamp still
refreshes changed preset content during development.

## Language policy

The PM and every child role use Taiwan Traditional Chinese (繁體中文，臺灣用語) for
user-visible communication and reports. Code, commands, paths, identifiers, API and
package names, exact logs, and exact error messages remain unchanged. English source
text or tool output does not switch the crew's communication language.

## Verification

Run the repository checks with:

```sh
npm test
node tools/verify-role-settings.mjs
node tools/verify-mount.mjs
node tools/verify-preset-install.mjs
```

The checks use temporary folders and synthetic settings where integration coverage
needs them; they must not read or write the production `$DSH_HOME` (default `~/.dsh`; on
Windows, `%USERPROFILE%\.dsh`). On a plain checkout, role-fiber and real role-tool mount checks
explicitly skip until DSH's optional
`dsh-tool-subagent` dependency is linked.

## License

MIT
