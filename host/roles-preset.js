// dsh-crew role tools (AGENT plane).
//
// Loaded by the `crew` agent preset, not by the profile. That placement is the
// whole point: model-facing tools in dsh live in the agent preset, and a role's
// allow/deny list is checked against the preset's tool set when a child starts.
// Mounted here, every name a role filter uses is defined a few lines away in
// the same preset file, so a spawn cannot fail on a name the deployment happens
// not to have.
//
// Each role becomes one `@deepseek-ai/dsh-tool-subagent` instance carrying:
//   - its persona   -> roles/<role>.md plus the language policy, rendered as the
//                      child's own `deployment:persona-prefix` scope section;
//                      it shadows the inherited prefix so the child cannot talk
//                      itself into another job;
//   - its filter    -> `allow` (reviewers: read only) or `deny` (makers: no
//                      crew tools), enforced by `tools.restrict()`;
//   - `maxDepth: 1` -> only the root PM can start a role, whatever the filter
//                      says. This is the guarantee that names no tool at all.

import * as toolSubagent from "@deepseek-ai/dsh-tool-subagent";

import {
  CREW_SETTINGS_NAMESPACE,
  CREW_SETTINGS_SCHEMA,
  cloneRoleModels,
  crewSettingsEntry,
  roleAgentOptions,
  roleModelFor,
} from "./roles-settings.js";
import { PM_ONLY_TOOLS, ROLES, TAIWAN_LANGUAGE_POLICY, readRoleText } from "./roles.js";
import { composeChildPersona } from "./child-policy.js";

export const name = "dsh-crew-roles";

const hasOwn = (value, key) => value !== null
  && (typeof value === "object" || typeof value === "function")
  && Object.prototype.hasOwnProperty.call(value, key);
const configValueFor = (config, field, roleKey) => {
  const map = hasOwn(config, field) ? config[field] : undefined;
  return hasOwn(map, roleKey) ? map[roleKey] : undefined;
};

export function apply(ctx, config) {
  const rolesDir = config?.rolesDir;

  // ── One validation pass, before anything mounts (CRD 0016) ────────────────
  //
  // A tool filter a user gave us has to name at least one tool. Anything else is
  // refused here, and the refusal happens in a pass of its own so a bad config
  // gives NO crew rather than half a crew: the roles that come before the bad
  // one in the table would otherwise already be mounted, and a host that logs an
  // apply error and carries on would be left with part of a crew and no filter
  // problem in sight.
  //
  // What is refused, and why it is not only `[]`: every one of `[]`, `""`, `0`,
  // `false` and `{}` failed the old `length > 0` test, so the filter half was
  // dropped — and when it was the only half, `toolFilter` was left off the config
  // altogether and that child got every tool this preset registers. Someone who
  // writes `roleAllow: security_reviewer: ""` in YAML has written an empty
  // roleAllow as far as they are concerned, so refusing the array alone left the
  // same trap open in four other spellings. A non-empty value that is not a list
  // (a bare `read`) is refused too: it used to be handed straight to the tool as
  // a filter, and the child then failed its own config schema.
  //
  // On a reviewer any of this silently undid the read-only rule, and that rule is
  // not a preference: a reviewer with `write` and `edit` denied still wrote a
  // file with `echo hello > file`, and with the shell denied too its tool list
  // still held `workflow`, `ralph` and desktop-control MCP tools.
  //
  // `undefined` and `null` are the exception, deliberately: a missing key, or `~`
  // or a blank value in YAML, is how a user turns an override off and asks for
  // the shipped list. `??` below does exactly that, so this pass leaves it alone.
  //
  // Falling back to the shipped list on a bad value would be wrong in the other
  // direction — the user would believe their own line is in force while a
  // different list runs. So this throws, like readRoleText further down: break
  // startup with a message that names the line to fix, instead of surfacing
  // halfway through somebody's job.
  for (const role of ROLES) {
    for (const field of ["roleAllow", "roleDeny"]) {
      const configured = configValueFor(config, field, role.key);
      if (configured === undefined || configured === null) continue;

      // A well-formed list can still be a useless one: a `roleAllow` that names
      // ONLY the PM-only tools leaves the child nothing it may call, and the
      // mount below would then drop the filter altogether — the opposite of what
      // the user asked for. Refused here, before the shape gate, because this
      // value is a list and the gate below would let it through.
      if (field === "roleAllow" && Array.isArray(configured) && configured.length > 0) {
        const usable = configured.filter((name) => !PM_ONLY_TOOLS.includes(name));
        if (usable.length === 0) {
          throw new Error(`dsh-crew: roleAllow.${role.key} names only ${PM_ONLY_TOOLS.join(", ")}, and no child role may use ${PM_ONLY_TOOLS.length === 1 ? "it" : "them"} — ${PM_ONLY_TOOLS.join(", ")} ${PM_ONLY_TOOLS.length === 1 ? "is the PM's own tool" : "are the PM's own tools"}, and dsh-crew removes ${PM_ONLY_TOOLS.length === 1 ? "it" : "them"} from every role's filter whatever this line says. As written the list would leave ${role.toolName} with no filter at all, and a child with no filter gets every tool this preset registers. Name at least one tool the role may really use, or delete the roleAllow.${role.key} line.`);
        }
      }

      if (Array.isArray(configured) && configured.length > 0) continue;

      // Each half of the message has to be true of THIS role and THIS value, so
      // both are worked out rather than described in general terms. Three things
      // decide it: whether the value would have reached the filter at all (the
      // same `?.length > 0` test the mount below uses), whether the user wrote
      // the field this role actually ships, and whether an allow list is what
      // closes this role down. Only three of the nine roles are read-only
      // reviewers, and the researcher ships an allow list but keeps `write`.
      const shipped = field === "roleAllow" ? role.allow : role.deny;
      const reachedTheFilter = configured?.length > 0;
      const opened = role.allow === undefined ? "" : `, and this role ships an allow list, so everything it does not name would be open again${role.key.includes("review") ? " — that list is the only thing keeping a reviewer read-only" : ""}`;
      const consequence = reachedTheFilter
        ? `a value that is not a list would be handed to ${role.toolName} as its tool filter, and tool-subagent's config schema would reject it — \`allow\` and \`deny\` must be lists of strings — so that role would never work at all`
        : shipped === undefined
          ? `this role does not ship a ${field} list, so an empty one would be dropped without a word while the list it does ship stayed in force — the line would look applied and do nothing`
          : `it would leave ${role.toolName} with no tool filter at all, so that child would get every tool this preset registers${opened}`;

      throw new Error(`dsh-crew: ${field}.${role.key} is ${Array.isArray(configured) ? "an empty list" : "not a list of tool names"} (${JSON.stringify(configured) ?? String(configured)}), and dsh-crew will not start with it. A tool filter has to name at least one tool: ${consequence}. Write the tool names you want instead (${field} REPLACES the shipped list for that role, it is not added to it), or delete the ${field}.${role.key} line — or set it to nothing at all, a bare ~ in YAML — to keep the shipped list.`);
    }
  }

  // Read once so settings changes can reload the tool instance without
  // re-reading user files or changing the role/filter safety boundary.
  //
  // A child persona is four layers, joined in a fixed order by
  // `composeChildPersona` (Crew V2): the rules every crew role carries, the shape
  // layer for this role (`policy`: a maker that changes and runs files, a reviewer
  // that only reads, or neither), the role's own markdown, and the language
  // policy. The shared rules used to be written out again inside each of the nine
  // role files — nine copies of a rule are nine rules — and they live once now, in
  // `host/child-policy.js`.
  const personas = new Map(ROLES.map((role) => [
    role.key,
    composeChildPersona({
      roleText: readRoleText(role.personaFile, rolesDir),
      policy: role.policy,
      languagePolicy: TAIWAN_LANGUAGE_POLICY,
    }),
  ]));
  // Read and validate the legacy fallback BEFORE anything mounts, so a broken
  // legacy route gives NO crew rather than half a crew — the same reason the
  // filter pass above runs first. The settings provider validates the same entry
  // as its composition base, and a throw after the mounts would leave a partial
  // crew with no clear message about which line to fix.
  let roleModels;
  try {
    roleModels = cloneRoleModels(config?.roleModels);
  } catch (error) {
    throw new Error(`dsh-crew: the legacy roleModels entry in the crew preset is not usable (${error?.message ?? String(error)}). Fix that line, or delete it and configure the roles in the dsh-crew-roles Web Settings card instead. dsh-crew will not start with a partial crew.`);
  }
  const fibers = new Map();
  const signatures = new Map();
  /** Last config of each role that really went live, for rollback after a rejected update. */
  const liveConfigs = new Map();
  const updateTails = new Map();
  /**
   * The signature each role's LAST QUEUED update is trying to reach.
   *
   * `signatures` is what really went live and `updateTails` is what is still on
   * its way, and the gap between them is not academic. A settings event computes
   * each role's new config and compares it against `signatures`, so without a
   * record of the queued target a second event that asks for the value the FIRST
   * event is still moving away from reads as "already correct" and queues
   * nothing — the fiber then lands on the superseded value and stays there,
   * because every later event sees the same matching signature. Two opposite
   * edits inside one host round reproduce it.
   */
  const pending = new Map();
  /**
   * The signature of the last attempt the host REFUSED, per role.
   *
   * A rejected `Fiber.update` is rolled back and the target is refused every time
   * it is tried, so a retry that fires from inside the rollback is an endless loop
   * that never leaves the process: the same value, the same error, forever. This is
   * what makes the convergence below run once. A fresh `onChange` still retries —
   * that is a new settings event, and by then the reason for the refusal (a provider
   * that went away, say) may be gone — but nothing self-schedules.
   */
  const rejected = new Map();

  /** Build one complete tool-subagent config from the current role settings. */
  const roleConfig = (role) => {
    // A role ships either an allow list (everything else is closed) or a deny
    // list. `roleAllow` / `roleDeny` replace the shipped list for that role —
    // except for the PM-only tools, which are a hard invariant rather than a
    // default: a user's line shapes every other tool, and it cannot open the PM's
    // own material to a child. An allow list closes a role by construction, so
    // those tools are removed from it (a list that named nothing else was refused
    // in the pass above, so this can never empty it); a deny list is the only
    // thing keeping a child out, so they are unioned in.
    const allow = configValueFor(config, "roleAllow", role.key) ?? role.allow;
    const deny = configValueFor(config, "roleDeny", role.key) ?? role.deny;
    const allowed = allow?.length > 0 ? allow.filter((name) => !PM_ONLY_TOOLS.includes(name)) : allow;
    const denied = deny?.length > 0 ? [...new Set([...deny, ...PM_ONLY_TOOLS])] : deny;
    const filter = {
      ...allowed?.length > 0 ? { allow: allowed } : {},
      ...denied?.length > 0 ? { deny: denied } : {},
    };
    const agentOptions = roleAgentOptions(roleModelFor(roleModels, role.key));

    return {
      provider: "spawn",
      toolName: role.toolName,
      // Continuable children can be messaged again (`send_message`) and can
      // answer their parent (`report`) — the two channels the crew runs on.
      backgroundMode: "continuable",
      // Read at mount: a missing or broken role file must break startup with a
      // clear message, not surface halfway through a job.
      persona: personas.get(role.key),
      ...Object.keys(filter).length > 0 ? { toolFilter: filter } : {},
      maxDepth: 1,
      ...agentOptions === undefined ? {} : { agentOptions },
    };
  };

  /** Report a live settings reload failure without breaking the PM prompt. */
  const reportUpdateFailure = (role, error) => {
    const logger = typeof ctx?.logger === "function" ? ctx.logger("dsh-crew") : undefined;
    const message = `dsh-crew: could not apply settings for ${role.toolName}: ${error?.message ?? String(error)}`;
    if (typeof logger?.warn === "function") logger.warn(message);
    else if (typeof logger?.info === "function") logger.info(message);
    else console.warn(message);
  };

  /**
   * Hand one config to a role's fiber and WAIT for the reload to settle.
   *
   * `Fiber.update(config)` is not the call that reports a failed reload. It runs
   * the `internal/update` waterfall and returns its result, which for the default
   * restart is `restart()` — a promise that settles the plugin's own dispose/start
   * work, but NOT the fiber's lifecycle. `Fiber._reload()` catches a startup
   * failure, logs it, stores it in `_error` and marks the epoch inactive instead of
   * rejecting anything, and what rethrows it is `Fiber.await()`:
   *
   *     async await() {
   *       while (this.inertia) await this.inertia;
   *       if (this._error) throw this._error;
   *       return this;
   *     }
   *
   * So `await fiber.update(next)` alone would report success for a reload that
   * FAILED: no throw here, no rollback, and `signatures` would claim a route the
   * fiber never reached. `await()` also drains `inertia`, the fiber's own
   * reload/unload chain, which `update()` never touches.
   *
   * The order matters and both halves are load-bearing:
   *
   *     await fiber.update(next);   // stage the config, run the restart
   *     await fiber.await();        // settle the lifecycle, rethrow a startup error
   *
   * This is dsh's own pattern for a live row — `cordis-plugin-loader` and
   * `dsh-agent-presets` both do `update`/`plugin(...)` and then `await fiber.await()`.
   *
   * `update()` returns `undefined` on its early path (a fiber that is not in state
   * `2`), and then `await()` still has the whole job: an errored fiber IS in state
   * `3`, not `2`, so a rollback lands on that early path. It clears `_error`, drops
   * the epoch to inactive and refreshes, and the reload it kicks off is settled by
   * the `await()` beside it.
   *
   * @throws whatever the reload's startup threw, through `await()`
   */
  const applyToFiber = async (fiber, config) => {
    const staged = fiber.update(config);
    await staged;
    if (typeof fiber.await === "function") await fiber.await();
  };

  /**
   * Update one standing role tool in order; the fiber performs a safe reload.
   *
   * A failed reload leaves the fiber in its error state, where `ctx.get` answers
   * nothing and the role tool is gone from the session. So this keeps the last
   * config that really went live and puts it back when the new one is refused:
   * without that, one bad settings value (a provider that just went away, say)
   * would delete a role tool that was working a moment ago, and the PM would lose
   * a role until the next dsh restart.
   */
  const updateRole = (role, next) => {
    const signature = JSON.stringify(next);
    pending.set(role.key, signature);
    const previous = updateTails.get(role.key) ?? Promise.resolve();
    const tail = previous.catch(() => {}).then(async () => {
      const fiber = fibers.get(role.key);
      if (typeof fiber?.update !== "function") return;
      try {
        await applyToFiber(fiber, next);
        liveConfigs.set(role.key, next);
        signatures.set(role.key, signature);
      } catch (error) {
        reportUpdateFailure(role, error);
        rejected.set(role.key, signature);
        const lastGood = liveConfigs.get(role.key);
        if (lastGood === undefined || lastGood === next) return;
        try {
          await applyToFiber(fiber, lastGood);
          signatures.set(role.key, JSON.stringify(lastGood));
        } catch (restoreError) {
          reportUpdateFailure(role, restoreError);
        }
      }
    });
    updateTails.set(role.key, tail);
    // One `then` per update while a burst is running, and each one does nothing
    // until it is the tail. The last one to land converges the fiber.
    tail.then(() => {
      if (updateTails.get(role.key) !== tail) return;
      // This role's queue is empty, so nothing is on its way any more. The queued
      // target has to be forgotten HERE, or a later settings event asking for the
      // same value is read as "already queued" and skipped for good: after a
      // refused `B` rolls back to `A`, `pending` still holds `B`, so a fresh
      // `onChange` that asks for `B` again would clear `rejected` and then hit the
      // `pending` guard — the retry the refusal handling promises would never run.
      if (pending.get(role.key) === signature) pending.delete(role.key);
      reconcileRole(role);
    });
  };

  /**
   * Put one role's fiber on the value the settings really hold, once the queue
   * for that role is empty.
   *
   * `refreshRoleTools` deliberately does not queue the update whose signature the
   * role is already moving towards, so the queue can end with the fiber on a
   * superseded value. This is what closes that gap.
   *
   * What is still not covered here: nothing in this repository runs a REAL Cordis
   * fiber. `tools/verify-role-settings.mjs` drives these paths with a synthetic one
   * that copies the live API's shape — `update()` synchronous-or-thenable, a
   * separate `await()` that settles the lifecycle and throws the startup error —
   * but the behavior it imitates belongs to dsh, and installing that peer is the
   * step `verify-mount.mjs` reports as a SKIP on a plain checkout and in CI.
   */
  const reconcileRole = (role) => {
    const next = roleConfig(role);
    const signature = JSON.stringify(next);
    if (signature === (signatures.get(role.key) ?? "")) return;
    // Only for a target that is really new. The same value coming back out of a
    // refusal would be re-queued by every rollback, and it would be refused again.
    if (rejected.get(role.key) === signature) return;
    updateRole(role, next);
  };

  /**
   * Reconcile settings changes without remounting a second copy of a tool.
   *
   * A signature is advanced only when the new config really went live (inside
   * `updateRole`), so a rejected change is retried instead of being remembered as
   * applied. A settings event always means a fresh attempt: the refusal recorded
   * for that role is cleared here, so asking for the same route again after a fix
   * is not mistaken for the very attempt that already failed.
   */
  const refreshRoleTools = () => {
    for (const role of ROLES) {
      const next = roleConfig(role);
      const signature = JSON.stringify(next);
      if (signature === (rejected.get(role.key) ?? "")) rejected.delete(role.key);
      if (signatures.get(role.key) === signature) continue;
      if (pending.get(role.key) === signature) continue;
      updateRole(role, next);
    }
  };

  // Mount every role before attaching the optional settings provider. That
  // preserves the old no-settings path and gives settings reloads a Fiber to
  // update when the Web host is present.
  for (const role of ROLES) {
    const next = roleConfig(role);
    signatures.set(role.key, JSON.stringify(next));
    liveConfigs.set(role.key, next);
    fibers.set(role.key, ctx.plugin(toolSubagent, next));
  }

  // The settings service is optional outside Web. When it is present, its
  // resolved namespace becomes the one live source for subsequent role-tool
  // updates; its composition base is the legacy roleModels map above.
  if (typeof ctx?.inject === "function") {
    ctx.inject(["settings"], (settingsCtx) => {
      if (typeof settingsCtx?.settings?.installSection !== "function") return;
      let source = () => ({ roleModels });
      settingsCtx.settings.installSection(
        ctx,
        CREW_SETTINGS_NAMESPACE,
        CREW_SETTINGS_SCHEMA,
        crewSettingsEntry(config),
        {
          setSource: (nextSource) => {
            source = nextSource;
          },
          onChange: () => {
            // A settings provider can hand back anything. Read the resolved
            // layer, but keep the last good map when it is not usable: throwing
            // here would surface inside the settings host, far from the edit
            // that caused it, and leaving the old routes in place is the safe
            // half of the trade (the role tools never lose their filter).
            let next;
            try {
              next = cloneRoleModels(source()?.roleModels);
            } catch (error) {
              reportUpdateFailure({ toolName: `${CREW_SETTINGS_NAMESPACE} settings` }, error);
              return;
            }
            roleModels = next;
            refreshRoleTools();
          },
        },
      );
    });
  }
}
