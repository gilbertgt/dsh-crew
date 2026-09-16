// T-138 (Crew V2) — `crew_playbook` is a hard invariant, not a default.
//
// The tool hands a role the PM's own flow playbooks, resolved inside this package.
// No child may call it, and that has to hold whatever a user writes in
// `roleAllow` / `roleDeny`: a filter is a user's own line, and the point of a
// PM-only tool is that no line of theirs can open it.
//
// What this case proves, by mounting the real preset and reading the filter each
// role would really be started with:
//   1. the shipped filters already close it — the deny lists carry it, and the
//      three read-only allow lists never name it;
//   2. a `roleDeny` that does NOT name it still ends up denying it;
//   3. a `roleAllow` that DOES name it has it removed;
//   4. a `roleAllow` that names ONLY it is refused at mount, rather than leaving
//      the child with no filter at all (which would open every tool instead);
//   5. the roles that ship an allow list are untouched by any of this.

import { cpSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { check, cleanUp, done, REPO, tempDir } from "../lib/qa.mjs";
import { PM_ONLY_TOOLS, ROLES } from "../../host/roles.js";

/** A throwaway copy of the two folders the preset reads, plus a stub of the package it imports. */
function presetCopy() {
  const dir = tempDir("crew-qa-pmonly-");
  for (const entry of ["host", "roles"]) cpSync(join(REPO, entry), join(dir, entry), { recursive: true });
  const stub = join(dir, "node_modules", "@deepseek-ai", "dsh-tool-subagent");
  mkdirSync(stub, { recursive: true });
  writeFileSync(join(stub, "package.json"), `${JSON.stringify({
    name: "@deepseek-ai/dsh-tool-subagent",
    version: "0.0.0-qa-stub",
    type: "module",
    exports: "./index.js",
  }, null, 2)}\n`);
  writeFileSync(join(stub, "index.js"), "export const name = \"dsh-tool-subagent-qa-stub\";\n");
  return dir;
}

const load = (dir, file) => import(pathToFileURL(join(dir, "host", file)).href);

function mount(preset, config) {
  const mounts = [];
  let thrown;
  try {
    preset.apply({ plugin: (plugin, cfg) => mounts.push({ plugin, config: cfg }) }, config);
  } catch (error) {
    thrown = error;
  }
  return { mounts, thrown };
}

/** The filter one role would be started with, given a set of mounts. */
function filterFor(mounts, key) {
  const index = ROLES.findIndex((role) => role.key === key);
  return mounts[index]?.config?.toolFilter;
}

function refuses(role, filter) {
  // Closed either way: an allow list that does not name them, or a deny list that does.
  const allowed = filter?.allow;
  const denied = filter?.deny;
  if (!Array.isArray(allowed) && !Array.isArray(denied)) return false;
  if (Array.isArray(allowed)) return PM_ONLY_TOOLS.every((name) => !allowed.includes(name));
  return PM_ONLY_TOOLS.every((name) => denied.includes(name));
}

const dir = presetCopy();
try {
  const preset = await load(dir, "roles-preset.js");

  // ---------------------------------------------------------------- 1. shipped
  const shipped = mount(preset, {});
  check("the preset mounts with the shipped filters", shipped.thrown === undefined, shipped.thrown?.message ?? "");
  check("one mount per role again", shipped.mounts.length === ROLES.length, `${shipped.mounts.length} mount(s)`);

  for (const role of ROLES) {
    const filter = filterFor(shipped.mounts, role.key);
    check(
      `shipped: ${role.key} cannot call ${PM_ONLY_TOOLS.join(", ")}`,
      refuses(role, filter),
      `filter is ${JSON.stringify(filter)}`,
    );
  }
  for (const key of ["researcher", "code_reviewer", "security_reviewer", "doc_reviewer"]) {
    const filter = filterFor(shipped.mounts, key);
    check(
      `shipped: ${key} is closed by an allow list that never names the PM-only tools`,
      Array.isArray(filter?.allow) && refuses(key, filter),
      `filter is ${JSON.stringify(filter)} — an allow-list role must stay closed by construction`,
    );
  }

  // ------------------------------------------- 2. a deny list that omits them
  const customDeny = mount(preset, { roleDeny: { engineer: ["bash", "write"] } });
  const denyFilter = filterFor(customDeny.mounts, "engineer");
  check(
    "a `roleDeny` that does not name the PM-only tool still denies it",
    customDeny.thrown === undefined && PM_ONLY_TOOLS.every((name) => denyFilter?.deny?.includes(name)),
    `the user's list was ${JSON.stringify(["bash", "write"])} and the filter is ${JSON.stringify(denyFilter)}`,
  );
  check(
    "and the tools the user did name are still denied",
    ["bash", "write"].every((name) => denyFilter?.deny?.includes(name)),
    `filter is ${JSON.stringify(denyFilter)} — a hard invariant must not replace the user's own line`,
  );

  // ------------------------------------- 3. an allow list that names the tool
  const customAllow = mount(preset, { roleAllow: { code_reviewer: ["read", ...PM_ONLY_TOOLS] } });
  const allowFilter = filterFor(customAllow.mounts, "code_reviewer");
  check(
    "a `roleAllow` that names the PM-only tool has it removed",
    customAllow.thrown === undefined
      && Array.isArray(allowFilter?.allow)
      && PM_ONLY_TOOLS.every((name) => !allowFilter.allow.includes(name))
      && allowFilter.allow.includes("read"),
    `filter is ${JSON.stringify(allowFilter)} — the tool has to be stripped and the rest kept`,
  );

  // ------------------------------------------- 4. an allow list of nothing else
  const onlyPm = mount(preset, { roleAllow: { code_reviewer: [...PM_ONLY_TOOLS] } });
  check(
    "a `roleAllow` that names ONLY the PM-only tool is refused at mount",
    onlyPm.thrown !== undefined
      && PM_ONLY_TOOLS.every((name) => onlyPm.thrown.message.includes(name))
      && /roleAllow\.code_reviewer/.test(onlyPm.thrown.message),
    onlyPm.thrown === undefined
      ? `mounting was allowed, and the filter became ${JSON.stringify(filterFor(onlyPm.mounts, "code_reviewer"))} — a child with no filter gets every tool`
      : `the refusal reads ${JSON.stringify(onlyPm.thrown.message)}`,
  );

  // ------------------------------------- 5. the allow-list roles stay closed
  const withDeny = mount(preset, { roleDeny: { code_reviewer: [...PM_ONLY_TOOLS] } });
  const stillClosed = filterFor(withDeny.mounts, "code_reviewer");
  check(
    "an allow-list role stays closed even when a deny list is added alongside",
    withDeny.thrown === undefined && refuses("code_reviewer", stillClosed),
    `filter is ${JSON.stringify(stillClosed)}`,
  );
} finally {
  cleanUp(dir);
}

console.log(`      PM-only tools: ${PM_ONLY_TOOLS.join(", ")}`);
done();
