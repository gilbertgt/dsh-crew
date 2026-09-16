// Focused checks for the dsh-crew role-settings contract. The source checks run
// on a plain checkout; the optional schema checks run when DSH's dependency is
// available locally. Nothing here touches a real DSH_HOME.

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const rolesSettingsPath = join(packageRoot, "host", "roles-settings.js");
const rolesPresetPath = join(packageRoot, "host", "roles-preset.js");
const clientPath = join(packageRoot, "client", "crew-settings.js");
const settings = readFileSync(rolesSettingsPath, "utf8");
const rolesPreset = readFileSync(rolesPresetPath, "utf8");
const client = readFileSync(clientPath, "utf8");

let failures = 0;
const fail = (message) => { failures += 1; console.error(`FAIL  ${message}`); };
const ok = (message) => console.log(`ok    ${message}`);
const check = (condition, message) => condition ? ok(message) : fail(message);

check(settings.includes('CREW_SETTINGS_NAMESPACE = "dsh-crew-roles"'), "host owns the dsh-crew-roles namespace");
check(/z\.dict\(ROLE_MODEL_SCHEMA\)/.test(settings), "role routes use a dynamic dictionary instead of catalog enums");
check(settings.includes("reasoningEffort: z.string()"), "reasoning effort remains an open string for unavailable IDs");
check(/model\.length === 0/.test(settings) && /return undefined/.test(settings), "empty role models omit AgentOptions and inherit the parent route");
check(/reasoningEffort/.test(settings) && /roleAgentOptions/.test(rolesPreset), "role tools derive AgentOptions through the shared route helper");
check(/roleModelFor/.test(settings) && /roleModelFor\(roleModels, role\.key\)/.test(rolesPreset), "role tools only read own role-model map entries");
check(/configValueFor\(config, field, role\.key\)/.test(rolesPreset) && /configValueFor\(config, "roleAllow", role\.key\)/.test(rolesPreset), "role filters only read own configuration entries");
check(/settings\.installSection\(\s*ctx,\s*CREW_SETTINGS_NAMESPACE/.test(rolesPreset), "the optional settings provider is installed through the host settings seam");
check(/Fiber\.update|fiber\.update/.test(rolesPreset), "committed settings changes reload existing role fibers");
check(client.includes('const SETTINGS_NAMESPACE = "dsh-crew-roles"'), "the client keeps the settings namespace contract");
check(/ctx\.slots\.inject\("settings\.section"/.test(client), "the Crew client registers through settings.section");
check(client.includes('id: "crew"'), "the Crew settings section id is crew");
check(client.includes('order: 30'), "the Crew settings section follows the built-in settings sections");
check(/label: \(\) => t\("nav"\)/.test(client) && client.includes('nav: "Crew"'), "the Crew settings section has a visible localized label");
check(!client.includes('settings.plugin.item'), "the Crew client no longer registers settings.plugin.item");
check(client.includes("CrewSettingsSection") && client.includes('className: "dshCrewSettingsSection"'), "the section renders the existing Crew role UI directly");
check(client.includes('ctx.remote.session.modelCatalog()'), "the client reads the live model catalog");
check(/roleModels", roleKey/.test(client), "the client writes role-specific path mutations");
check(/draftRoleModels|draftChangedRoles/.test(client) && /conflicted/.test(client), "the client retains drafts across revision conflicts");
check(client.includes("unavailable") && client.includes("reasoning?.efforts"), "the client retains unavailable routes and uses model-owned reasoning metadata");
check(/resetRole\(roleKey\)/.test(client) && /op: "unset"/.test(client) && /discard\(\)/.test(client), "the client retains per-role reset and discard-all draft behavior");
check(/invalid: invalidRoute,/.test(client) && !/invalid: invalidRoute \|\| reasoningInvalid/.test(client), "an unavailable catalog value warns instead of blocking Save");
check(/this\.catalogDefault\?\.model/.test(client) && /catalogRoute\(\)/.test(client), "a custom route is pre-filled from the catalog default");
check(/UNSAFE_RECORD_KEYS/.test(client) && /Object\.create\(null\)/.test(client), "the client clone drops prototype keys and never writes through a prototype");
check(!/provider\s*:\s*["'](?:openai|anthropic|deepseek|codex)/i.test(client), "the client does not hardcode provider identifiers");

const roleKeys = [
  "researcher", "architect", "engineer", "test_engineer", "code_engineer",
  "qa", "code_reviewer", "security_reviewer", "doc_reviewer",
];
check(roleKeys.every((key) => client.includes(`"${key}"`)), "the client includes all nine child-role rows");

async function checkClientSectionLifecycle() {
  const previousWindow = globalThis.window;
  let loadedFactory;
  const React = {
    Fragment: Symbol("Fragment"),
    createElement: (type, props, ...children) => ({
      type,
      props: {
        ...(props ?? {}),
        children: children.length <= 1 ? children[0] : children,
      },
    }),
  };
  const dictionary = {    nav: "Crew",
    title: "Crew role model settings",
    description: "Choose a Provider, Model and Reasoning Effort for each child role.",
    rootTitle: "PM / Root Session",
    rootHint: "A role inherits the parent/session route without a custom route.",
    noRoot: "No host default route is available.",
    roleResearcher: "Researcher",
    roleArchitect: "Architect",
    roleEngineer: "Engineer",
    roleTestEngineer: "Test Engineer",
    roleCodeEngineer: "Code Engineer",
    roleQa: "QA",
    roleCodeReviewer: "Code Reviewer",
    roleSecurityReviewer: "Security Reviewer",
    roleDocReviewer: "Doc Reviewer",
  };
  globalThis.window = { __ModuleLoader__: { load: (payload) => { loadedFactory = payload.factory; } } };
  try {
    await import(`${pathToFileURL(clientPath).href}?verify=${Date.now()}-${Math.random()}`);
    check(typeof loadedFactory === "function", "the client bundle registers a module-loader factory");
    if (typeof loadedFactory !== "function") return;

    const moduleExports = loadedFactory((name) => {
      if (name === "react") return React;
      throw new Error(`unexpected client dependency: ${name}`);
    });
    const registrations = [];
    const slotCleanups = [];
    const effectCleanups = [];
    const scopeSnapshot = {
      status: "ready",
      writable: true,
      revision: 1,
      value: { roleModels: {} },
      base: { roleModels: {} },
      user: { roleModels: {} },
    };
    const scope = {
      getSnapshot: () => scopeSnapshot,
      subscribe: () => () => {},
      mutate: async () => {},
    };
    const ctx = {
      locale: {
        bind: () => (key) => dictionary[key] ?? key,
        register: () => () => {},
      },
      effect: (callback) => {
        const cleanup = callback();
        if (typeof cleanup === "function") effectCleanups.push(cleanup);
        return cleanup;
      },
      settingsScope: {
        bind: (spec) => {
          check(spec?.namespace === "dsh-crew-roles", "the section binds the dsh-crew-roles namespace");
          return scope;
        },
      },
      remote: {
        session: {
          modelCatalog: async () => ({
            ok: true,
            value: {
              default: { provider: "synthetic", model: "synthetic-model" },
              groups: [{
                id: "synthetic",
                name: "Synthetic",
                models: [{ id: "synthetic-model", name: "Synthetic Model", reasoning: { efforts: [] } }],
              }],
            },
          }),
        },
        $on: () => () => {},
      },
      on: () => () => {},
      slots: {
        inject: (name, callback) => {
          check(name === "settings.section", "the client injects only the settings.section surface");
          const cleanup = callback();
          if (typeof cleanup === "function") slotCleanups.push(cleanup);
          return cleanup;
        },
        register: (options, component) => {
          const entry = { options, component };
          registrations.push(entry);
          return () => {
            const index = registrations.indexOf(entry);
            if (index >= 0) registrations.splice(index, 1);
          };
        },
      },
    };
    const disposeMount = () => {
      for (const cleanup of [...effectCleanups].reverse()) cleanup();
      for (const cleanup of [...slotCleanups].reverse()) cleanup();
      effectCleanups.length = 0;
      slotCleanups.length = 0;
    };
    const renderText = (node, output = []) => {
      if (node === null || node === undefined || node === false) return output;
      if (Array.isArray(node)) {
        for (const child of node) renderText(child, output);
        return output;
      }
      if (typeof node === "string" || typeof node === "number") {
        output.push(String(node));
        return output;
      }
      if (typeof node === "object") {
        if (typeof node.type === "function") renderText(node.type(node.props), output);
        else renderText(node.props?.children, output);
      }
      return output;
    };

    moduleExports.apply(ctx);
    check(registrations.length === 1, "mount registers one Crew settings section");
    const first = registrations[0];
    check(first?.options?.id === "crew", "mounted section id is crew");
    check(first?.options?.label?.() === "Crew", "mounted section label is visible");
    check(first?.options?.order === 30, "mounted section uses order 30 after built-in navigation");
    const injected = first?.options?.inject?.();
    check(typeof injected?.save === "function" && typeof injected?.retryCatalog === "function", "section keeps the existing load/save controller actions");
    await new Promise((resolve) => setImmediate(resolve));
    const state = injected?.hooks?.crewSettings?.getSnapshot?.();
    check(state?.available === true, "section becomes available after loading the live catalog");
    check(state?.roles?.length === 9, "section state retains all nine child roles");
    const tree = first?.component?.({
      ...injected,
      t: (key) => dictionary[key] ?? key,
      useCrewSettings: (selector) => selector(state),
    });
    const rendered = renderText(tree);
    const roleLabels = ["Researcher", "Architect", "Engineer", "Test Engineer", "Code Engineer", "QA", "Code Reviewer", "Security Reviewer", "Doc Reviewer"];
    check(rendered.includes("PM / Root Session"), "section render contains the PM / Root Session row");
    check(roleLabels.every((label) => rendered.includes(label)), "section render contains every child-role row");

    const unavailableTree = first?.component?.({
      ...injected,
      t: (key) => ({ ...dictionary, settingsUnavailable: "Role settings are unavailable. Showing read-only defaults." })[key] ?? key,
      useCrewSettings: (selector) => selector({ ...state, available: false, writable: true }),
    });
    const unavailableRendered = renderText(unavailableTree);
    const unavailableControls = [];
    const collectControls = (node) => {
      if (node === null || node === undefined || node === false) return;
      if (Array.isArray(node)) {
        for (const child of node) collectControls(child);
        return;
      }
      if (typeof node !== "object") return;
      if (typeof node.type === "function") {
        collectControls(node.type(node.props));
        return;
      }
      if (node.type === "select" || node.type === "button") unavailableControls.push(node);
      collectControls(node.props?.children);
    };
    collectControls(unavailableTree);
    check(unavailableRendered.includes("Crew role model settings"), "unavailable scope still renders the Crew settings title");
    check(roleLabels.every((label) => unavailableRendered.includes(label)), "unavailable scope still renders every child-role row");
    check(unavailableRendered.includes("Role settings are unavailable. Showing read-only defaults."), "unavailable scope renders an explicit unavailable status");
    check(unavailableControls.length > 0 && unavailableControls.every((control) => control.props?.disabled === true), "unavailable scope keeps every control disabled");

    disposeMount();
    check(registrations.length === 0, "dispose removes the Crew settings section registration");
    moduleExports.apply(ctx);
    check(registrations.length === 1 && registrations[0]?.options?.id === "crew", "remount restores the Crew settings section");
    disposeMount();
    check(registrations.length === 0, "second dispose leaves no stale Crew settings registration");
  } catch (error) {
    fail(`client section lifecycle check failed: ${error?.message ?? String(error)}`);
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
}

await checkClientSectionLifecycle();

/**
 * The preset's own `roleModels` entry is a route no settings write can reach.
 *
 * The namespace composes the user layer on top of that entry, so unsetting a role
 * key does not fall back to the session route while the line is still in the
 * preset: it falls back to the legacy route, and `roleAgentOptions()` keeps handing
 * it to the child. The page used to offer "Inherit PM / Session" as if the write
 * could do that, and the render straight afterwards reported the legacy route as an
 * unavailable provider — a scary warning about a route the user never chose and
 * cannot remove from this page. What is checked here is that the page tells the
 * truth instead: the inherit draft is accepted and described, the mode control says
 * inherit while the draft holds, the legacy route is named as the preset's, and the
 * way out is written down.
 */
async function checkClientLegacyFallback() {
  const previousWindow = globalThis.window;
  let loadedFactory;
  const React = {
    Fragment: Symbol("Fragment"),
    createElement: (type, props, ...children) => ({
      type,
      props: {
        ...(props ?? {}),
        children: children.length <= 1 ? children[0] : children,
      },
    }),
  };
  const dictionary = {
    mode: "Route mode",
    inherit: "Inherit PM / Session",
    custom: "Custom route",
    presetFallback: "Using the preset legacy fallback; discarding the user override returns to it.",
    presetFallbackInherit: "This role still runs on the preset's legacy route, so \"Inherit\" does not change the effective route yet.",
    presetFallbackFix: "To really return to PM / Session, delete that roleModels line from the preset.",
    inh: "Inherit PM / Session",
  };
  globalThis.window = { __ModuleLoader__: { load: (payload) => { loadedFactory = payload.factory; } } };
  try {
    await import(`${pathToFileURL(clientPath).href}?legacy=${Date.now()}-${Math.random()}`);
    if (typeof loadedFactory !== "function") {
      fail("the client bundle registers a module-loader factory (legacy-fallback check)");
      return;
    }
    const moduleExports = loadedFactory((name) => {
      if (name === "react") return React;
      throw new Error(`unexpected client dependency: ${name}`);
    });

    const legacyRoute = { provider: "preset-provider", model: "preset-model" };
    const listeners = new Set();
    let snapshot = {
      status: "ready",
      writable: true,
      revision: 1,
      value: { roleModels: { engineer: legacyRoute } },
      base: { roleModels: { engineer: legacyRoute } },
      user: { roleModels: {} },
    };
    const ops = [];
    const scope = {
      getSnapshot: () => snapshot,
      subscribe: (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
      mutate: async (nextOps) => {
        ops.push(...nextOps);
        snapshot = { ...snapshot, revision: snapshot.revision + 1 };
        for (const listener of [...listeners]) listener();
      },
    };
    let registration;
    const ctx = {
      locale: { bind: () => (key) => dictionary[key] ?? key, register: () => () => {} },
      effect: (callback) => callback(),
      settingsScope: { bind: () => scope },
      remote: {
        session: {
          modelCatalog: async () => ({
            ok: true,
            value: {
              default: { provider: "synthetic", model: "synthetic-model" },
              groups: [{ id: "synthetic", name: "Synthetic", models: [{ id: "synthetic-model", name: "Synthetic Model" }] }],
              failures: [],
            },
          }),
        },
        $on: () => () => {},
      },
      on: () => () => {},
      slots: {
        inject: (_name, callback) => callback(),
        register: (options, component) => { registration = { options, component }; return () => {}; },
      },
    };
    moduleExports.apply(ctx);
    await new Promise((resolve) => setImmediate(resolve));
    const injected = registration?.options?.inject?.();
    const state = () => injected?.hooks?.crewSettings?.getSnapshot?.();
    const engineer = () => state()?.roles?.find((role) => role.key === "engineer");
    const render = () => {
      const tree = registration.component({
        ...injected,
        t: (key) => dictionary[key] ?? key,
        useCrewSettings: (selector) => selector(state()),
      });
      const output = [];
      const walk = (node) => {
        if (node === null || node === undefined || node === false) return;
        if (Array.isArray(node)) { for (const child of node) walk(child); return; }
        if (typeof node === "string" || typeof node === "number") { output.push(String(node)); return; }
        if (typeof node !== "object") return;
        if (typeof node.type === "function") { walk(node.type(node.props)); return; }
        walk(node.props?.children);
      };
      walk(tree);
      return output;
    };

    check(
      engineer()?.legacyFallback === true,
      "a legacy route the user never chose is reported as the preset's fallback, not as a custom route",
    );
    check(
      render().includes(dictionary.presetFallbackFix),
      "the page says how to really return the role to the session route",
    );
    check(
      engineer()?.hasUserOverride === false && engineer()?.hasStoredUserRoute === false,
      "a route that lives in the preset is not reported as the user's own override",
    );

    injected.editMode("engineer", "inherit");
    const drafted = engineer();
    check(
      drafted?.mode !== "custom" && render().includes(dictionary.presetFallbackInherit),
      "clicking Inherit explains that the preset's legacy route is still what runs",
    );
    check(
      drafted?.status !== "unavailable-provider",
      `clicking Inherit does not turn the preset's own route into an unavailable-provider warning (status ${drafted?.status})`,
    );
    check(
      drafted?.hasUserOverride === true,
      "the draft can be taken back: the row offers a control that unsets it again",
    );

    await injected.save();
    check(
      ops.length === 1 && ops[0]?.op === "unset" && ops[0]?.path?.[1] === "engineer",
      `Inherit writes exactly the user-layer unset (wrote ${JSON.stringify(ops)})`,
    );
    // The write cannot clear a route that lives in the preset, so the row keeps
    // explaining itself: the preset's route is still what runs, and the line that
    // would really hand this role back to the session route is named. The badge
    // alone cannot carry that — the legacy provider is not in the live catalog, so
    // the status the catalog gives it is "unavailable".
    const settledRender = render();
    check(
      engineer()?.legacyFallback === true
        && settledRender.includes(dictionary.presetFallbackInherit)
        && settledRender.includes(dictionary.presetFallbackFix),
      "after the write the role still explains the preset's fallback and how to end it",
    );
  } catch (error) {
    fail(`client legacy-fallback check failed: ${error?.message ?? String(error)}`);
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
}

await checkClientLegacyFallback();

try {
  const runtime = await import("../host/roles-settings.js");
  check(runtime.roleAgentOptions({ provider: "synthetic", model: "synthetic-model", reasoningEffort: "deep" })?.provider === "synthetic", "runtime preserves the configured provider");
  check(runtime.roleAgentOptions({ provider: "synthetic", model: "synthetic-model", reasoningEffort: "deep" })?.reasoningEffort === "deep", "runtime emits camelCase reasoningEffort");
  check(runtime.roleAgentOptions({ provider: "synthetic", model: "" }) === undefined, "runtime omits an empty model route");
  check(runtime.roleAgentOptions({ provider: "synthetic", model: "synthetic-model", reasoningEffort: "" })?.reasoningEffort === undefined, "runtime omits an empty effort");
  check(runtime.roleAgentOptions({ provider: "synthetic", model: "synthetic-model" })?.model === "synthetic-model", "runtime keeps a route with no optional effort");
  check(runtime.roleAgentOptions({ provider: "", model: "synthetic-model" })?.provider === undefined, "runtime omits an empty provider while keeping the model route");
  const inheritedRoute = Object.create({ model: "evil-model", provider: "evil-provider" });
  check(runtime.roleAgentOptions(inheritedRoute) === undefined, "runtime ignores inherited route fields");
  const unknownRoute = runtime.cloneRoleModels({ future_role: { provider: "gone-provider", model: "gone-model", reasoningEffort: "gone-effort" } });
  check(runtime.roleModelFor(unknownRoute, "future_role")?.model === "gone-model", "clone keeps unknown role entries for forward compatibility");
  const dangerousInput = JSON.parse('{"__proto__":{"engineer":{"provider":"evil-provider","model":"exfil-model"}}}');
  const safeClone = runtime.cloneRoleModels(dangerousInput);
  check(runtime.roleModelFor(safeClone, "engineer") === undefined && !Object.hasOwn(safeClone, "__proto__"), "clone drops prototype-pollution keys and hidden inherited routes");
  const resolved = runtime.CREW_SETTINGS_SCHEMA({ roleModels: { engineer: { provider: "gone-provider", model: "gone-model", reasoningEffort: "gone-effort" } } });
  check(resolved.roleModels.engineer.provider === "gone-provider" && resolved.roleModels.engineer.model === "gone-model" && resolved.roleModels.engineer.reasoningEffort === "gone-effort", "schema preserves unavailable provider/model/effort identifiers");
  const pollutedResolved = runtime.CREW_SETTINGS_SCHEMA({ roleModels: dangerousInput });
  check(runtime.roleModelFor(pollutedResolved.roleModels, "engineer") === undefined, "schema output does not expose an inherited prototype route to role lookup");
} catch (error) {
  if (error?.code === "ERR_MODULE_NOT_FOUND" && /schemastery/.test(error.message ?? "")) ok("runtime schema checks skipped: @deepseek-ai/schemastery is not installed in this plain checkout");
  else fail(`runtime role-settings import failed: ${error?.message ?? String(error)}`);
}

try {
  const { apply } = await import("../host/roles-preset.js");
  const mounts = [];
  const updates = [];
  let active;
  let settingsHooks;
  let installedNamespace;
  let rejectNextEngineerUpdate = false;
  const ctx = {
    logger: () => ({ warn: () => {} }),
    plugin: (_plugin, config) => {
      mounts.push(config);
      return {
        update: async (next) => {
          updates.push(next);
          if (config.toolName === "crew_engineer" && rejectNextEngineerUpdate) {
            rejectNextEngineerUpdate = false;
            throw new Error("synthetic route rejection");
          }
        },
      };
    },
    inject: (_services, callback) => callback({
      settings: {
        installSection: (_owner, namespace, schema, entry, hooks) => {
          installedNamespace = namespace;
          active = entry;
          settingsHooks = hooks;
          hooks.setSource(() => active);
          hooks.onChange();
          if (typeof schema !== "function") throw new Error("role settings schema is not callable");
        },
      },
    }),
  };
  apply(ctx, {
    roleModels: {
      engineer: { provider: "legacy-provider", model: "legacy-model" },
    },
  });
  const initial = mounts.find((config) => config.toolName === "crew_engineer");
  check(mounts.length === 9, "settings bridge keeps the flat nine-role mount topology");
  check(installedNamespace === "dsh-crew-roles", "settings bridge installs the expected namespace");
  check(initial?.agentOptions?.model === "legacy-model" && initial?.agentOptions?.provider === "legacy-provider", "legacy roleModels remains the initial composition fallback");
  active = { roleModels: { engineer: { provider: "synthetic", model: "synthetic-model", reasoningEffort: "deep" } } };
  settingsHooks.onChange();
  await new Promise((resolve) => setTimeout(resolve, 0));
  const custom = updates.filter((config) => config.toolName === "crew_engineer").at(-1);
  check(custom?.agentOptions?.provider === "synthetic" && custom?.agentOptions?.model === "synthetic-model" && custom?.agentOptions?.reasoningEffort === "deep", "settings changes update the existing role fiber with camelCase AgentOptions");
  const beforeRejectedUpdate = updates.length;
  rejectNextEngineerUpdate = true;
  active = { roleModels: { engineer: { provider: "rejected-provider", model: "rejected-model", reasoningEffort: "invalid" } } };
  settingsHooks.onChange();
  await new Promise((resolve) => setTimeout(resolve, 0));
  const rejectedSequence = updates.slice(beforeRejectedUpdate).filter((config) => config.toolName === "crew_engineer");
  check(
    rejectedSequence.length === 2
      && rejectedSequence[0]?.agentOptions?.model === "rejected-model"
      && rejectedSequence[1]?.agentOptions?.model === "synthetic-model"
      && rejectedSequence[1]?.agentOptions?.reasoningEffort === "deep",
    "a rejected Fiber.update immediately restores the last-good role config",
  );
  active = { roleModels: { engineer: { provider: "", model: "", reasoningEffort: "stale" } } };
  settingsHooks.onChange();
  await new Promise((resolve) => setTimeout(resolve, 0));
  const inherited = updates.filter((config) => config.toolName === "crew_engineer").at(-1);
  check(inherited?.agentOptions === undefined, "an empty model route removes AgentOptions and returns to parent inheritance");
  active = { roleModels: Object.create({ engineer: { provider: "evil-provider", model: "exfil-model" } }) };
  settingsHooks.onChange();
  await new Promise((resolve) => setTimeout(resolve, 0));
  const hidden = updates.filter((config) => config.toolName === "crew_engineer").at(-1);
  check(hidden?.agentOptions === undefined, "settings changes ignore inherited prototype routes");
  const inheritedAllow = Object.create({ security_reviewer: ["bash"] });
  const beforeFilterFixture = mounts.length;
  apply(ctx, { roleAllow: inheritedAllow });
  const securityMount = mounts.slice(beforeFilterFixture).find((config) => config.toolName === "crew_security_reviewer");
  check(!securityMount?.toolFilter?.allow?.includes("bash"), "role filters ignore inherited hidden allow-list entries");
  ok("role-fiber integration checks passed with the linked DSH tool dependency");
  // Coverage limit, said where the fixture is: every fiber below is synthetic —
  // `update()` resolves or throws when THIS file decides. What a real Cordis
  // `Fiber.update` does to a rejected update, and whether re-updating with the old
  // config really restores the tool, is dsh's behavior and is not exercised here or
  // anywhere else in the repository: installing that peer is the step
  // `verify-mount.mjs` reports as a SKIP on a plain checkout, and CI is one.
} catch (error) {
  if (error?.code === "ERR_MODULE_NOT_FOUND" && /dsh-tool-subagent|schemastery/.test(error.message ?? "")) ok("role-fiber integration checks skipped: dsh's optional tool dependency is not linked in this plain checkout");
  else fail(`role-fiber integration import failed: ${error?.message ?? String(error)}`);
}

console.log(failures === 0 ? "\nall role-settings checks passed" : `\n${failures} role-settings check(s) failed`);
process.exit(failures === 0 ? 0 : 1);
