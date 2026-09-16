// T-138 (Crew V2) — the playbook loader, and the path bug it exists to close.
//
// The PM's flows live in `roles/playbooks/`, inside the PACKAGE. Before this
// tool the PM was told to read them with `read roles/playbooks/crew-flow.md` — a
// workspace-relative path. That is right only when the working directory happens
// to be a dsh-crew checkout; installed as a package (npm, a global install, a
// linked profile, the copied preset) the PM's `read` resolves it against the
// USER'S project, where no `roles/` directory exists. The route that depends on
// the flow then fails in a way that reads as "the playbook is missing".
//
// What this case proves, all of it by running the real code:
//   1. `readPlaybookByName()` answers from a session whose cwd is somewhere else
//      entirely, for every playbook the manifest names;
//   2. `crew_playbook` really registers a tool of that name, with the manifest's
//      names as its enum, and its `execute` returns the file's text;
//   3. an unknown name is refused with the list of real ones, rather than a
//      file-not-found from somewhere deeper;
//   4. the tool module loads and registers with no `dsh-crew` checkout as the
//      working directory — which is the whole point.
//
// Point 2 mounts the tool on a fake registry with a stub `@deepseek-ai/dsh-tools`
// (the real one is a dsh peer this machine cannot install), so this is a real
// mount and a real `execute` call, not a source-text search.

import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { check, done, REPO, cleanUp, tempDir } from "../lib/qa.mjs";
import { PLAYBOOK_NAMES, PLAYBOOKS, readPlaybookByName } from "../../host/playbooks.js";

// ------------------------------------------------- 1. cwd has nothing to do with it

const elsewhere = mkdtempSync(join(tmpdir(), "crew-qa-elsewhere-"));
const before = process.cwd();
try {
  process.chdir(elsewhere);
  check(
    "the session's working directory is a folder with nothing in it",
    readdirSync(elsewhere).length === 0,
    `${elsewhere} holds ${readdirSync(elsewhere).join(", ")} — a path relative to it would not resolve to the package`,
  );

  for (const name of PLAYBOOK_NAMES) {
    let text = "";
    let error;
    try {
      text = readPlaybookByName(name);
    } catch (thrown) {
      error = thrown;
    }
    check(
      `readPlaybookByName("${name}") answers from a cwd outside the package`,
      error === undefined && text.length > 0,
      `cwd ${process.cwd()}: ${error?.message ?? "returned an empty playbook"}`,
    );
  }

  // The same name, spelled with the extension, is tolerated rather than fatal:
  // a model that writes `crew-flow.md` should not be told it asked for a
  // playbook that does not exist.
  check(
    "the `.md` suffix is tolerated",
    readPlaybookByName("crew-flow.md").length === readPlaybookByName("crew-flow").length,
    "crew-flow and crew-flow.md answered differently",
  );

  let unknown;
  try {
    readPlaybookByName("solo-flow");
  } catch (thrown) {
    unknown = thrown;
  }
  check(
    "an unknown name is refused with the list of real playbooks",
    unknown !== undefined
      && PLAYBOOK_NAMES.every((name) => unknown.message.includes(name)),
    `expected a refusal naming ${PLAYBOOK_NAMES.join(", ")}, got ${unknown?.message ?? "no error at all"}`,
  );
} finally {
  process.chdir(before);
  cleanUp(elsewhere);
}

// ------------------------------------- 2. the tool registers and really reads

/**
 * A throwaway package root with the two modules the tool needs and a stub
 * `@deepseek-ai/dsh-tools`, so `defineTool` is the loader's own identity
 * function and the spec it hands back is what the case inspects.
 */
function stubPackage() {
  const dir = tempDir("crew-qa-playbook-");
  cpSync(join(REPO, "host"), join(dir, "host"), { recursive: true });
  cpSync(join(REPO, "roles"), join(dir, "roles"), { recursive: true });
  const tools = join(dir, "node_modules", "@deepseek-ai", "dsh-tools");
  mkdirSync(tools, { recursive: true });
  writeFileSync(join(tools, "package.json"), `${JSON.stringify({
    name: "@deepseek-ai/dsh-tools",
    version: "0.0.0-qa-stub",
    type: "module",
    exports: "./index.js",
  }, null, 2)}\n`);
  writeFileSync(join(tools, "index.js"), "export const defineTool = (spec) => spec;\n");
  return dir;
}

const dir = stubPackage();
try {
  const module = await import(pathToFileURL(join(dir, "host", "playbook-tool.js")).href);
  const registered = [];
  const thrown = (() => {
    try {
      module.apply({ tools: { register: (tool) => registered.push(tool) } });
    } catch (error) {
      return error;
    }
    return undefined;
  })();

  check(
    "host/playbook-tool.js mounts on a bare tool registry",
    thrown === undefined && registered.length === 1,
    `${thrown?.message ?? `${registered.length} tool(s) registered`}`,
  );

  const tool = registered[0];
  if (tool !== undefined) {
    check(
      "the tool is named crew_playbook",
      tool.name === "crew_playbook",
      `registered as ${JSON.stringify(tool.name)}`,
    );
    check(
      "its only parameter is the playbook name, limited to the manifest",
      tool.parameters?.name?.required === true
        && Array.isArray(tool.parameters?.name?.enum)
        && tool.parameters.name.enum.join(",") === PLAYBOOK_NAMES.join(","),
      `parameters are ${JSON.stringify(tool.parameters?.name)}`,
    );
    check(
      "its description says the alternative is not a workspace path",
      /workspace|user's project/i.test(tool.description ?? "")
        && /instead of|not in/i.test(tool.description ?? ""),
      `the description does not tell the PM why it should not read a path instead: ${JSON.stringify(tool.description?.slice(0, 160))}`,
    );

    // A real call, from a cwd outside the package, returning the file's own text.
    const callDir = tempDir("crew-qa-call-");
    const here = process.cwd();
    let value;
    let callError;
    try {
      process.chdir(callDir);
      value = await tool.execute({ name: "hard-rules" });
    } catch (error) {
      callError = error;
    } finally {
      process.chdir(here);
      cleanUp(callDir);
    }
    check(
      "crew_playbook.execute({ name: 'hard-rules' }) returns that playbook's text",
      callError === undefined
        && value?.name === "hard-rules"
        && value.text === readFileSync(join(REPO, "roles", "playbooks", "hard-rules.md"), "utf8").trim(),
      callError?.message ?? `returned ${JSON.stringify(value?.name)} with ${value?.text?.length ?? 0} characters`,
    );
    check(
      "the tool result renders the playbook text itself",
      Array.isArray(tool.output?.render?.({ name: "hard-rules" }, value))
        && tool.output.render({ name: "hard-rules" }, value)[0]?.text === value?.text,
      "render did not hand the model the playbook text",
    );

    let refused;
    try {
      await tool.execute({ name: "nope" });
    } catch (error) {
      refused = error;
    }
    check(
      "an unknown playbook name is refused inside the tool too",
      refused !== undefined && PLAYBOOK_NAMES.every((name) => refused.message.includes(name)),
      `expected a refusal naming every real playbook, got ${refused?.message ?? "no error"}`,
    );

    console.log(`      playbooks offered: ${PLAYBOOKS.map((playbook) => playbook.file).join(", ")}`);
  }
} finally {
  cleanUp(dir);
}

done();
