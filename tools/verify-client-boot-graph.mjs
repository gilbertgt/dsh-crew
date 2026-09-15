// Isolated regression for the Web client boot graph. It reads this package only,
// composes the relevant loader rows in memory, and never uses a production
// profile or the real ~/.dsh home.

import { strict as assert } from "node:assert";
import { existsSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { tmpdir, userInfo } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = join(packageRoot, "package.json");
const patchPath = join(packageRoot, "cordis.patch.yml");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const patchText = readFileSync(patchPath, "utf8");

let failures = 0;
const ok = (message) => console.log(`ok    ${message}`);
const fail = (message) => {
  failures += 1;
  console.error(`FAIL  ${message}`);
};
const check = (condition, message) => condition ? ok(message) : fail(message);

check((manifest.scripts?.test ?? "").includes("node tools/verify-client-boot-graph.mjs"), "npm test includes the isolated client boot-graph regression");
const EXPECTED_EXPORTS = Object.freeze({
  ".": "./host/crew.js",
  "./client": "./client/crew-settings.js",
});

/** Resolve only a canonical package-relative export target inside packageRoot. */
function resolvePackageTarget(root, target, expectedTarget) {
  if (
    typeof target !== "string"
    || target.length === 0
    || isAbsolute(target)
    || (expectedTarget !== undefined && target !== expectedTarget)
  ) return undefined;

  let canonicalRoot;
  let canonicalTarget;
  try {
    canonicalRoot = realpathSync(root);
    canonicalTarget = realpathSync(resolve(root, target));
  } catch {
    return undefined;
  }

  const canonicalRelative = relative(canonicalRoot, canonicalTarget);
  if (
    canonicalRelative === ""
    || canonicalRelative === ".."
    || canonicalRelative.startsWith(`..${sep}`)
    || isAbsolute(canonicalRelative)
  ) return undefined;
  return canonicalTarget;
}

/** Report an invalid export before any filesystem read or module import. */
function safeExportTarget(root, packageManifest, exportName, report = fail) {
  const target = packageManifest.exports?.[exportName];
  const resolvedTarget = resolvePackageTarget(root, target, EXPECTED_EXPORTS[exportName]);
  if (resolvedTarget === undefined) {
    report(`package export "${exportName}" target is not the expected package-relative target or is outside packageRoot (${JSON.stringify(target)})`);
    return undefined;
  }
  return resolvedTarget;
}

function canonicalFixturePath(target) {
  try {
    return realpathSync(target);
  } catch {
    return resolve(target);
  }
}

function isWithinOrEqual(parent, candidate) {
  const candidateRelative = relative(parent, candidate);
  return candidateRelative === ""
    || (
      candidateRelative !== ".."
      && !candidateRelative.startsWith(`..${sep}`)
      && !isAbsolute(candidateRelative)
    );
}

function canonicalPrivateTempRoot() {
  const privateTempRoot = canonicalFixturePath(tmpdir());
  const realUserDshHome = canonicalFixturePath(join(userInfo().homedir, ".dsh"));
  if (isWithinOrEqual(realUserDshHome, privateTempRoot)) {
    throw new Error(`symlink fixture temp root is inside the real DSH home: ${privateTempRoot}`);
  }
  return privateTempRoot;
}
function scalar(value) {
  const text = value.trim();
  if (text === "") return undefined;
  if (text.startsWith("'") && text.endsWith("'")) return text.slice(1, -1).replace(/''/g, "'");
  if (text.startsWith('"') && text.endsWith('"')) return JSON.parse(text);
  if (text === "true") return true;
  if (text === "false") return false;
  if (text === "null") return null;
  return text;
}

/**
 * Parse the active loader row mappings in this patch. This deliberately handles
 * YAML comments and indentation rather than searching for a name substring, so
 * a subpath row cannot masquerade as a package-root row.
 */
function parseLoaderRows(text) {
  const rows = [];
  let current;
  let configIndent = -1;

  for (const rawLine of text.split(/\r?\n/)) {
    if (rawLine.trim() === "" || rawLine.trimStart().startsWith("#")) continue;

    const rowStart = rawLine.match(/^(\s*)-\s+id:\s*(.+)$/);
    if (rowStart) {
      current = { id: scalar(rowStart[2]) };
      rows.push(current);
      configIndent = -1;
      continue;
    }
    if (current === undefined) continue;

    const field = rawLine.match(/^(\s+)([A-Za-z][\w-]*):(?:\s*(.*))?$/);
    if (!field) continue;
    const indent = field[1].length;
    const key = field[2];
    const value = scalar(field[3] ?? "");
    if (key === "config" && value === undefined) {
      current.config = {};
      configIndent = indent;
    } else if (configIndent >= 0 && indent > configIndent) {
      current.config[key] = value;
    } else {
      current[key] = value;
      configIndent = -1;
    }
  }
  return rows;
}

/**
 * Model the installed ClientModuleRegistry boundary: only an exact bare
 * package row enrolls the package's declared client export in the graph.
 */
function composeBootGraph(packageManifest, rows, root) {
  const rootExport = packageManifest.exports?.["."];
  const clientExport = packageManifest.exports?.["./client"];
  const entries = [];

  for (const row of rows) {
    if (row.name !== packageManifest.name || rootExport === undefined || clientExport === undefined) continue;
    const clientPath = resolvePackageTarget(root, clientExport, EXPECTED_EXPORTS["./client"]);
    if (clientPath === undefined || !existsSync(clientPath)) continue;
    entries.push({
      id: packageManifest.name,
      hostRowId: row.id,
      host: rootExport,
      client: clientExport,
      clientPath,
    });
  }

  return {
    entries,
    batches: entries.length === 0 ? [] : [{ id: "dsh-web-client", entries: entries.map((entry) => entry.id) }],
  };
}

function assertComposedCrewGraph(graph, clientExport) {
  const entry = graph.entries.find((candidate) => candidate.id === "dsh-crew");
  assert.ok(entry, "composed boot graph has a dsh-crew entry");
  assert.equal(entry.client, clientExport, "dsh-crew graph entry points to the package ./client export");
  assert.ok(existsSync(entry.clientPath), "dsh-crew graph entry resolves an existing client bundle");
  assert.ok(
    graph.batches.some((batch) => batch.entries.includes("dsh-crew")),
    "composed boot graph has a batch containing dsh-crew",
  );
}

const rows = parseLoaderRows(patchText);
const expectedRows = new Map([
  ["dsh-crew-core", "dsh-crew"],
  ["dsh-crew-git-guard", "dsh-crew/host/git-guard.js"],
  ["dsh-crew-pm-write-guard", "dsh-crew/host/pm-write-guard.js"],
]);
check(rows.length === expectedRows.size, "cordis.patch.yml has exactly three active host rows");
check(new Set(rows.map((row) => row.id)).size === rows.length, "cordis.patch.yml host row ids are unique");
for (const [id, name] of expectedRows) {
  const matches = rows.filter((row) => row.id === id);
  check(matches.length === 1 && matches[0].name === name, `${id} keeps its id and name contract`);
  check(matches.every((row) => row.config === undefined), `${id} keeps its empty config contract`);
}
check(rows.filter((row) => row.name === "dsh-crew").length === 1, "the dsh-crew core mount appears exactly once");

const rootExport = manifest.exports?.["."];
const clientExport = manifest.exports?.["./client"];
check(rootExport === "./host/crew.js", 'package root export "." resolves to ./host/crew.js');
check(clientExport === "./client/crew-settings.js", 'package export "./client" remains ./client/crew-settings.js');
const hostPath = safeExportTarget(packageRoot, manifest, ".", fail) ?? "";
const clientPath = safeExportTarget(packageRoot, manifest, "./client", fail) ?? "";
check(hostPath !== "" && existsSync(hostPath), "the package root export resolves to the existing Host plugin");
check(clientPath !== "" && existsSync(clientPath), "the package ./client export resolves to the existing client bundle");
check(
  !Object.keys(manifest.dependencies ?? {}).some((dependency) => dependency === "dsh-crew"),
  "the package does not add a production dependency for the boot graph",
);

const graph = composeBootGraph(manifest, rows, packageRoot);
try {
  assertComposedCrewGraph(graph, clientExport);
  ok("the composed boot graph enrolls dsh-crew and its ./client bundle");
} catch (error) {
  fail(`the composed boot graph is missing the dsh-crew client enrollment: ${error.message}`);
}

const escapedClientManifest = {
  ...manifest,
  exports: { ...manifest.exports, "./client": process.execPath },
};
const escapedClientGraph = composeBootGraph(escapedClientManifest, rows, packageRoot);
check(escapedClientGraph.entries.length === 0, "composed boot graph rejects a client export outside packageRoot");
const alternateClientManifest = {
  ...manifest,
  exports: { ...manifest.exports, "./client": "./host/roles.js" },
};
const alternateClientGraph = composeBootGraph(alternateClientManifest, rows, packageRoot);
check(alternateClientGraph.entries.length === 0, "composed boot graph rejects an alternate client export target");
const escapedClientReports = [];
const escapedClientTarget = safeExportTarget(
  packageRoot,
  escapedClientManifest,
  "./client",
  (message) => escapedClientReports.push(`FAIL  ${message}`),
);
check(escapedClientTarget === undefined, "package-relative resolver rejects an escaped client export");
check(
  escapedClientReports.length === 1 && escapedClientReports[0].startsWith('FAIL  package export "./client" target'),
  "an escaped client export reports one named FAIL before filesystem access",
);
const privateTempRoot = canonicalPrivateTempRoot();
let symlinkRoot;
let symlinkOutsideRoot;
try {
  symlinkRoot = mkdtempSync(join(privateTempRoot, "dsh-crew-boot-graph-root-"));
  symlinkOutsideRoot = mkdtempSync(join(privateTempRoot, "dsh-crew-boot-graph-outside-"));
  const externalFile = join(symlinkOutsideRoot, "crew.js");
  writeFileSync(externalFile, "export default {};\n");
  symlinkSync(symlinkOutsideRoot, join(symlinkRoot, "link"), "junction");
  check(
    resolvePackageTarget(symlinkRoot, "./link/crew.js", "./link/crew.js") === undefined,
    "canonical resolver rejects an external symlink target",
  );
} finally {
  if (symlinkRoot !== undefined) rmSync(symlinkRoot, { recursive: true, force: true });
  if (symlinkOutsideRoot !== undefined) rmSync(symlinkOutsideRoot, { recursive: true, force: true });
}
const revertedRows = rows.map((row) => ({ ...row }));
const coreRow = revertedRows.find((row) => row.id === "dsh-crew-core");
if (coreRow !== undefined) coreRow.name = "dsh-crew/host/crew.js";
const revertedGraph = composeBootGraph(manifest, revertedRows, packageRoot);
let subpathRejected = false;
try {
  assertComposedCrewGraph(revertedGraph, clientExport);
} catch {
  subpathRejected = true;
}
check(subpathRejected, "reverting the core row to a subpath makes the composed graph test fail");

async function inspectHostPlugin(sourceManifest = manifest, importModule, report = fail) {
  const sourceHostPath = sourceManifest === manifest
    ? hostPath
    : safeExportTarget(packageRoot, sourceManifest, ".", report);
  if (!sourceHostPath || !existsSync(sourceHostPath)) return;
  try {
    const loadHost = importModule ?? ((target) => import(`${pathToFileURL(target).href}?verify=${Date.now()}-${Math.random()}`));
    const host = await loadHost(sourceHostPath);
    check(host.name === "dsh-crew-core", "the resolved package root is the dsh-crew-core Host plugin");
    check(Array.isArray(host.inject) && host.inject.includes("systemPrompt"), "the Host plugin keeps its systemPrompt injection");

    const sections = [];
    const contexts = [];
    const cleanups = [];
    const ctx = {
      effect: (callback) => {
        const cleanup = callback();
        if (typeof cleanup === "function") cleanups.push(cleanup);
        return cleanup;
      },
      systemPrompt: {
        section: (section) => { sections.push(section); return () => {}; },
        context: (context) => { contexts.push(context); return () => {}; },
      },
    };
    host.apply(ctx, { installPreset: false, resumeNotice: false });
    check(sections.some((section) => section.name === "crew:pm"), "the Host plugin still registers the crew:pm section");
    check(contexts.length === 0, "the isolated Host mount does not require a production job profile");
    for (const cleanup of cleanups.reverse()) cleanup();
  } catch (error) {
    fail(`resolved Host plugin could not be mounted in isolation: ${error.message}`);
  }
}
const escapedRootManifest = {
  ...manifest,
  exports: { ...manifest.exports, ".": process.execPath },
};
const escapedRootReports = [];
let externalImportAttempted = false;
await inspectHostPlugin(
  escapedRootManifest,
  () => {
    externalImportAttempted = true;
    return {};
  },
  (message) => escapedRootReports.push(`FAIL  ${message}`),
);
check(!externalImportAttempted, "an escaped root export never reaches dynamic import");
check(
  escapedRootReports.length === 1 && escapedRootReports[0].startsWith('FAIL  package export "." target'),
  "an escaped root export reports one named FAIL before filesystem access",
);
async function inspectClientBundle() {
  if (!clientPath || !existsSync(clientPath)) return;
  const source = readFileSync(clientPath, "utf8");
  check(source.includes('id: "crew"'), 'client bundle retains the settings.section id "crew"');
  check(source.includes("order: 30"), "client bundle retains settings.section order 30");
  check(source.includes('dsh-crew-roles'), "client bundle retains the dsh-crew-roles namespace");
  check(!source.includes("settings.plugin.item"), "client bundle does not register settings.plugin.item");

  const previousWindow = globalThis.window;
  let payload;
  globalThis.window = { __ModuleLoader__: { load: (loaded) => { payload = loaded; } } };
  try {
    await import(`${pathToFileURL(clientPath).href}?verify=${Date.now()}-${Math.random()}`);
  } catch (error) {
    fail(`client bundle could not be loaded through the browser module loader: ${error.message}`);
    return;
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }

  check(payload?.id === "dsh-crew", "client bundle registers the dsh-crew module-loader entry");
  if (typeof payload?.factory !== "function") return;

  const React = {
    Fragment: Symbol("Fragment"),
    createElement: (type, props, ...children) => ({ type, props: { ...(props ?? {}), children } }),
  };
  let moduleExports;
  try {
    moduleExports = payload.factory((name) => {
      if (name === "react") return React;
      throw new Error(`unexpected client dependency: ${name}`);
    });
  } catch (error) {
    fail(`client bundle factory could not be evaluated: ${error.message}`);
    return;
  }

  const registrations = [];
  const injectedSlots = [];
  let boundNamespace;
  const scope = {
    getSnapshot: () => ({ revision: 1, value: { roleModels: {} } }),
    subscribe: () => () => {},
    mutate: async () => {},
  };
  const ctx = {
    locale: {
      bind: () => (key) => key,
      register: () => () => {},
    },
    effect: (callback) => callback(),
    settingsScope: {
      bind: (spec) => { boundNamespace = spec?.namespace; return scope; },
    },
    remote: {
      session: {
        modelCatalog: async () => ({ ok: true, value: { default: undefined, groups: [] } }),
      },
      $on: () => () => {},
    },
    on: () => () => {},
    slots: {
      inject: (name, callback) => { injectedSlots.push(name); return callback(); },
      register: (options, component) => {
        registrations.push({ options, component });
        return () => {};
      },
    },
  };
  try {
    moduleExports.apply(ctx);
    check(injectedSlots.includes("settings.section"), "the client runtime injects settings.section");
    check(!injectedSlots.includes("settings.plugin.item"), "the client runtime does not inject settings.plugin.item");
    check(boundNamespace === "dsh-crew-roles", "the client runtime binds the dsh-crew-roles namespace");
    check(registrations.length === 1, "the client runtime registers one Crew settings section");
    check(registrations[0]?.options?.id === "crew", "the mounted settings section id is crew");
    check(registrations[0]?.options?.order === 30, "the mounted settings section order is 30");
  } catch (error) {
    fail(`client bundle runtime mount failed in isolation: ${error.message}`);
  }
}

await inspectHostPlugin();
await inspectClientBundle();

if (failures > 0) {
  console.error(`FAIL  ${failures} client boot-graph regression check(s)`);
  process.exitCode = 1;
} else {
  console.log("PASS  isolated client boot-graph regression");
}
