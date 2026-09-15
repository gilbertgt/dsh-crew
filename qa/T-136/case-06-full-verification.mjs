// T-136 DoD item 6: run every existing verification, the QA runner, npm.cmd test,
// and git diff --check, while proving a missing optional role-tool mount remains
// the existing explicit SKIP rather than becoming a silent or unrelated failure.
// The commands below execute real processes. They are not string-only checks.

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir, userInfo } from "node:os";
import { isAbsolute, join, relative, resolve, sep } from "node:path";

import {
  REPO,
  check,
  cleanUp,
  done,
  editJson,
  tempDir,
  tempRepo,
} from "../lib/qa.mjs";

const gitBash = "C:\\Program Files\\Git\\bin\\bash.exe";
const gitBin = "C:\\Program Files\\Git\\bin";
const hasGitBash = existsSync(gitBash);
const pathSeparator = process.platform === "win32" ? ";" : ":";

function canonicalPath(path) {
  try {
    return realpathSync(path);
  } catch {
    return resolve(path);
  }
}

const realUserHome = userInfo().homedir;
const realDshHome = realUserHome === "" ? "" : canonicalPath(resolve(realUserHome, ".dsh"));
const systemTempRoot = canonicalPath(tmpdir());

function pathIsInsideOrEqual(parent, candidate) {
  const canonicalParent = canonicalPath(parent);
  const canonicalCandidate = canonicalPath(candidate);
  const rel = relative(canonicalParent, canonicalCandidate);
  return rel === ""
    || (rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
}

if (realDshHome !== "" && pathIsInsideOrEqual(realDshHome, systemTempRoot)) {
  throw new Error(`refusing to use a system temp root inside the real DSH home: ${systemTempRoot} (real DSH home: ${realDshHome})`);
}

const samePath = (candidate, parent) => candidate !== undefined && parent !== ""
  && pathIsInsideOrEqual(parent, candidate);

function withGitBashPath(env, requested) {
  if (!requested || !hasGitBash) return env;
  const nextEnv = { ...env };
  const prefix = `${gitBin}${pathSeparator}`;
  const hasUpperPath = Object.prototype.hasOwnProperty.call(env, "PATH");
  const hasTitlePath = Object.prototype.hasOwnProperty.call(env, "Path");
  if (hasUpperPath) nextEnv.PATH = `${prefix}${env.PATH ?? ""}`;
  if (hasTitlePath) nextEnv.Path = `${prefix}${env.Path ?? ""}`;
  if (!hasUpperPath && !hasTitlePath) nextEnv.PATH = gitBin;
  return nextEnv;
}

function summaryLines(output) {
  return output
    .split(/\r?\n/)
    .filter((line) => /^(?:all .* passed|PASS  |SKIP  |crew QA:|Verdicts totals|FAIL  )/.test(line.trim()));
}

function failLines(output) {
  return output.split(/\r?\n/).filter((line) => line.startsWith("FAIL"));
}

function runCommand(commandText, executable, args, options = {}) {
  let privateHome;
  let result = { status: null };
  let output = "";
  let errorText = "";
  try {
    const requestedEnv = options.env ?? {};
    const inheritedEnv = options.baseEnv ?? process.env;
    for (const key of ["DSH_HOME", "HOME", "USERPROFILE"]) {
      if (samePath(requestedEnv[key], realDshHome)) {
        throw new Error(`refusing the real DSH path supplied for ${key}: ${requestedEnv[key]}`);
      }
    }

    privateHome = tempDir("crew-qa-case06-home-");
    if (realDshHome !== "" && pathIsInsideOrEqual(realDshHome, privateHome)) {
      throw new Error(`refusing generated private home inside the real DSH home: ${privateHome} (real DSH home: ${realDshHome})`);
    }
    const childEnv = {
      ...inheritedEnv,
      ...requestedEnv,
      DSH_HOME: privateHome,
      HOME: privateHome,
      USERPROFILE: privateHome,
    };
    for (const key of ["DSH_HOME", "HOME", "USERPROFILE"]) {
      if (samePath(childEnv[key], realDshHome)) {
        throw new Error(`refusing to run with the real DSH path in ${key}: ${childEnv[key]}`);
      }
    }

    result = spawnSync(executable, args, {
      cwd: options.cwd ?? REPO,
      encoding: "utf8",
      env: childEnv,
      windowsHide: true,
    });
    output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
    const error = result.error;
    errorText = error
      ? `${error.code ?? "spawn error"}: ${error.message}`
      : "";
  } catch (error) {
    errorText = `${error.code ?? "spawn error"}: ${error.message}`;
  } finally {
    if (privateHome) cleanUp(privateHome);
  }

  console.log(`\n命令：${commandText}`);
  console.log(`退出狀態：${result.status === null ? "null" : result.status}`);
  if (errorText) console.log(`啟動錯誤：${errorText}`);
  const summaries = summaryLines(output);
  if (summaries.length > 0) console.log(`totals:\n${summaries.join("\n")}`);
  if (result.status !== 0 && output.trim() !== "") {
    console.log(`實際輸出：\n${output.trimEnd()}`);
  }

  return { status: result.status, output, out: output, errorText };
}

function runCheckIsolated(dir, script) {
  const result = runCommand(`node ${script} (temporary copy)`, process.execPath, [script], { cwd: dir });
  return { ...result, out: result.output };
}

function summaryQaTotals(output) {
  return output
    .split(/\r?\n/)
    .filter((line) => /^crew QA: \d+ task\(s\) run, \d+ passed, 0 failed$/.test(line));
}

function assertGreen(commandText, result) {
  check(
    `${commandText} exits zero and reports no FAIL line`,
    result.status === 0 && failLines(result.output).length === 0,
    `exit ${result.status}; ${result.errorText || result.output.trim().slice(-1200)}`,
  );
}

function assertQaAggregateGreen(commandText, result) {
  const totals = summaryQaTotals(result.output);
  check(
    `${commandText} exits zero with a zero-failure QA total`,
    result.status === 0 && totals.length >= 1,
    `exit ${result.status}; ${result.errorText || totals.join("\n") || result.output.trim().slice(-1600)}`,
  );
}

function assertNpmAggregateGreen(commandText, result) {
  const qaTotals = summaryQaTotals(result.output);
  check(
    `${commandText} exits zero with npm test and QA totals green`,
    result.status === 0 && qaTotals.length >= 1 && /all Verdicts checks passed/.test(result.output),
    `exit ${result.status}; ${result.errorText || qaTotals.join("\n") || result.output.trim().slice(-1600)}`,
  );
}

const existingVerifications = [
  "tools/verify-guard.mjs",
  "tools/verify-pm-write-guard.mjs",
  "tools/verify-rule-guard-map.mjs",
  "tools/verify-jobs.mjs",
  "tools/verify-role-settings.mjs",
  "tools/verify-client-boot-graph.mjs",
  "tools/verify-mount.mjs",
  "tools/verify-preset-install.mjs",
  "tools/verify-links.mjs",
  "tools/verify-tasks.mjs",
];

// Run every repository verification directly, in the same order as the project
// checks, before the separately requested QA runner and npm test.
for (const script of existingVerifications) {
  const commandText = `node ${script}`;
  const result = runCommand(commandText, process.execPath, [script]);
  assertGreen(commandText, result);
}

// Establish that the temporary copies themselves are sound before removing the
// optional role-tool mount. This keeps a missing-mount SKIP from hiding a broken
// copy, and every child is launched through runCommand's private environment.
let baselineDir;
let missingMountDir;
try {
  baselineDir = tempRepo();
  const baseline = runCheckIsolated(baselineDir, "tools/verify-mount.mjs");
  check(
    "an untouched temporary copy of verify-mount is green",
    baseline.status === 0 && failLines(baseline.out).length === 0,
    `exit ${baseline.status}\n${baseline.out.trim().slice(-1200)}`,
  );

  missingMountDir = tempRepo();
  const nodeModules = join(missingMountDir, "node_modules");
  if (existsSync(nodeModules)) rmSync(nodeModules, { recursive: true, force: true });
  const missingMount = runCheckIsolated(missingMountDir, "tools/verify-mount.mjs");
  const skips = missingMount.out.split(/\r?\n/).filter((line) => line.startsWith("SKIP"));
  const expectedSkip = "SKIP  role-tool mount checks: dsh is not reachable from here";
  console.log(`\noptional role-tool mount missing copy output:\n${missingMount.out.trimEnd()}`);
  check(
    "a missing optional role-tool mount still exits zero without a FAIL line",
    missingMount.status === 0 && failLines(missingMount.out).length === 0,
    `exit ${missingMount.status}\n${missingMount.out.trim().slice(-1600)}`,
  );
  check(
    "a missing optional role-tool mount emits only the existing explicit SKIP",
    skips.length === 1 && skips[0].startsWith(expectedSkip),
    `SKIP lines (${skips.length}):\n${skips.join("\n")}`,
  );
} finally {
  if (missingMountDir) cleanUp(missingMountDir);
  if (baselineDir) cleanUp(baselineDir);
}

// Aggregate commands run in throwaway copies that contain every QA case except
// this file. This avoids recursive Case 06 execution without any child-visible
// marker or inherited descriptor. The task runner and all other T-136 cases stay
// in the copy, so the aggregate still tests the real runner and suite wiring.
function normalizeAggregateToLf(root) {
  let entries;
  try {
    entries = readdirSync(root, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue;
    const path = join(root, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === ".git" || entry.name === "node_modules") continue;
      normalizeAggregateToLf(path);
      continue;
    }
    if (!entry.isFile()) continue;
    let bytes;
    try {
      bytes = readFileSync(path);
    } catch {
      continue;
    }
    if (!bytes.includes(13)) continue;
    const normalized = Buffer.alloc(bytes.length);
    let written = 0;
    for (let index = 0; index < bytes.length; index += 1) {
      if (bytes[index] === 13 && bytes[index + 1] === 10) continue;
      normalized[written] = bytes[index];
      written += 1;
    }
    writeFileSync(path, normalized.subarray(0, written));
  }
}

function gitFailureDetail(result) {
  if (result.error) return `${result.error.code ?? "spawn error"}: ${result.error.message}`;
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
  return output || `status ${result.status}`;
}

function gitEnv(dir) {
  const privateHome = join(dir, ".case06-git-home");
  const privateXdg = join(privateHome, "xdg");
  const privateTmp = join(privateHome, "tmp");
  mkdirSync(privateHome, { recursive: true, mode: 0o700 });
  mkdirSync(privateXdg, { recursive: true, mode: 0o700 });
  mkdirSync(privateTmp, { recursive: true, mode: 0o700 });
  const env = {};
  for (const key of [
    "PATH",
    "Path",
    "PATHEXT",
    "SystemRoot",
    "ComSpec",
    "LANG",
    "LC_ALL",
    "LC_CTYPE",
    "LANGUAGE",
  ]) {
    if (process.env[key] !== undefined) env[key] = process.env[key];
  }
  env.HOME = privateHome;
  env.USERPROFILE = privateHome;
  env.XDG_CONFIG_HOME = privateXdg;
  env.TEMP = privateTmp;
  env.TMP = privateTmp;
  env.TMPDIR = privateTmp;
  env.GIT_CONFIG_NOSYSTEM = "1";
  env.GIT_CONFIG_GLOBAL = join(privateHome, "global.gitconfig");
  return env;
}

const AGGREGATE_COPY_ENTRIES = [
  "package.json",
  "cordis.patch.yml",
  "CLAUDE.md",
  "principles.md",
  "README.md",
  "README-zh.md",
  "CHANGELOG.md",
  // `CONTRIBUTING.md` is here for the same reason the four documents above are:
  // a case in the aggregate run reads it (`qa/T-137/case-05` judges the
  // contributor guide's three routes). Leaving it out does not fail loudly — the
  // case dies on a missing file inside a copy that looks complete, and the
  // aggregate run goes red for a reason that is not true of the repository.
  "CONTRIBUTING.md",
  "host",
  "roles",
  "preset",
  "tools",
  "client",
  ".github",
  "docs",
  "qa",
];

function aggregateCopy() {
  const dir = tempRepo();
  try {
    for (const entry of AGGREGATE_COPY_ENTRIES) {
      cpSync(join(REPO, entry), join(dir, entry), { recursive: true });
    }
    normalizeAggregateToLf(dir);
    const aggregateGitEnv = gitEnv(dir);

    const init = spawnSync("git", ["init", "--quiet"], { cwd: dir, env: aggregateGitEnv });
    if (init.status !== 0) {
      throw new Error(`aggregate copy git init failed (status ${init.status}): ${gitFailureDetail(init)}`);
    }
    const exported = spawnSync("git", ["fast-export", "3403c57"], {
      cwd: REPO,
      env: aggregateGitEnv,
      maxBuffer: 128 * 1024 * 1024,
    });
    if (exported.status !== 0) {
      throw new Error(`aggregate copy git fast-export 3403c57 failed (status ${exported.status}): ${gitFailureDetail(exported)}`);
    }
    const imported = spawnSync("git", ["fast-import"], {
      cwd: dir,
      env: aggregateGitEnv,
      input: exported.stdout,
      maxBuffer: 128 * 1024 * 1024,
    });
    if (imported.status !== 0) {
      throw new Error(`aggregate copy git fast-import failed (status ${imported.status}): ${gitFailureDetail(imported)}`);
    }
    const updatedRef = spawnSync("git", ["update-ref", "refs/heads/qa-case06", "3403c57"], { cwd: dir, env: aggregateGitEnv });
    if (updatedRef.status !== 0) {
      throw new Error(`aggregate copy git update-ref qa-case06 failed (status ${updatedRef.status}): ${gitFailureDetail(updatedRef)}`);
    }
    const symbolicHead = spawnSync("git", ["symbolic-ref", "HEAD", "refs/heads/qa-case06"], { cwd: dir, env: aggregateGitEnv });
    if (symbolicHead.status !== 0) {
      throw new Error(`aggregate copy git symbolic-ref HEAD failed (status ${symbolicHead.status}): ${gitFailureDetail(symbolicHead)}`);
    }

    const ownCase = join(dir, "qa", "T-136", "case-06-full-verification.mjs");
    if (existsSync(ownCase)) rmSync(ownCase, { force: true });
    return { dir, env: aggregateGitEnv };
  } catch (error) {
    cleanUp(dir);
    throw error;
  }
}

function runAggregate(commandText, executable, args, { prependGitBash = false } = {}) {
  const { dir, env: aggregateGitEnv } = aggregateCopy();
  try {
    const childEnv = withGitBashPath(aggregateGitEnv, prependGitBash);
    return runCommand(commandText, executable, args, { cwd: dir, baseEnv: childEnv });
  } finally {
    cleanUp(dir);
  }
}

// A bare `bash` is deliberately attempted first. On this Windows machine it is
// absent from PATH; the full Git Bash path is the per-process workaround and does
// not edit the repository or package scripts. Each aggregate copy excludes this
// Case 06 file, so its runner and npm test cannot recurse.
const bareQa = runAggregate("bash qa/run-all.sh", "bash", ["qa/run-all.sh"]);
let qaRun = bareQa;
if (bareQa.status === 0) {
  console.log("note  bare command was available; no Bash PATH workaround was needed.");
} else if (bareQa.errorText.includes("ENOENT")) {
  console.log(`note  bare command limitation: bash is not available on PATH (${bareQa.errorText}).`);
  check("the bare bash limitation is recorded before using the workaround", true);
  if (hasGitBash) {
    qaRun = runAggregate(
      "C:\\Program Files\\Git\\bin\\bash.exe qa/run-all.sh",
      gitBash,
      ["qa/run-all.sh"],
      { prependGitBash: true },
    );
    console.log("note  workaround: used C:\\Program Files\\Git\\bin\\bash.exe for this process only.");
  } else {
    check("Git Bash workaround exists when bare bash is unavailable", false, "C:\\Program Files\\Git\\bin\\bash.exe was not found");
  }
} else {
  check("bare bash qa runner exits zero", false, `exit ${bareQa.status}; ${bareQa.errorText || bareQa.output}`);
}
assertQaAggregateGreen("bash qa/run-all.sh (bare command or recorded Git Bash workaround)", qaRun);

// npm.cmd runs scripts.test, including the bare `bash qa/run-all.sh` segment. Add
// Git Bash's bin directory only to this child environment, leaving package.json
// and the repository test command untouched.
const npmCommand = process.platform === "win32" ? "npm.cmd test" : "npm test";
const npmExecutable = process.platform === "win32" ? "cmd.exe" : "npm";
const npmArgs = process.platform === "win32"
  ? ["/d", "/s", "/c", "npm.cmd test"]
  : ["test"];
// Windows runs the exact npm.cmd test command through cmd.exe; POSIX launches
// the npm executable directly, so no platform calls a nonexistent cmd.exe.
const npmRun = runAggregate(npmCommand, npmExecutable, npmArgs, {
  prependGitBash: true,
});
assertNpmAggregateGreen(npmCommand, npmRun);

const diffCommand = "git diff --check";
const diffRun = runCommand(diffCommand, "git", ["diff", "--check"]);
assertGreen(diffCommand, diffRun);

// Prove this case's green result is not vacuous: break the package-root export in
// a throwaway copy and require the real boot-graph regression to report its named
// FAIL lines and a non-zero exit. The repository is never modified.
let mutantDir;
try {
  mutantDir = tempRepo();
  editJson(mutantDir, "package.json", (manifest) => {
    manifest.exports["."] = "./host/missing-for-case-06.js";
  });
  const mutant = runCheckIsolated(mutantDir, "tools/verify-client-boot-graph.mjs");
  const mutantFails = failLines(mutant.out);
  console.log(`\n負向變異實際輸出（package root export 指向不存在的檔案）：\n${mutant.out.trimEnd()}`);
  check(
    "breaking the package-root export makes the real boot-graph verification fail",
    mutant.status !== 0
      && mutantFails.some((line) => line.includes('FAIL  package root export "." resolves to ./host/crew.js')),
    `exit ${mutant.status}; FAIL lines:\n${mutantFails.join("\n")}`,
  );
} finally {
  if (mutantDir) cleanUp(mutantDir);
}

// Prove the npm test wiring is a real guard, not a command-string assumption:
// remove only the boot-graph verifier segment from scripts.test in a throwaway
// copy, then require the verifier's named wiring check to reject that copy.
let wiringMutantDir;
try {
  wiringMutantDir = tempRepo();
  const wiringSegment = "node tools/verify-client-boot-graph.mjs";
  editJson(wiringMutantDir, "package.json", (manifest) => {
    const script = manifest.scripts?.test;
    if (typeof script !== "string") throw new Error("the copy has no scripts.test to mutate");
    const segments = script.split(" && ");
    const index = segments.indexOf(wiringSegment);
    if (index === -1) throw new Error(`scripts.test has no standalone ${wiringSegment} segment`);
    segments.splice(index, 1);
    manifest.scripts.test = segments.join(" && ");
  });
  const wiringMutant = runCheckIsolated(wiringMutantDir, "tools/verify-client-boot-graph.mjs");
  const wiringFails = failLines(wiringMutant.out);
  console.log(`\n負向變異實際輸出（移除 scripts.test 的 boot-graph verifier segment）：\n${wiringMutant.out.trimEnd()}`);
  check(
    "removing the boot-graph verifier from scripts.test makes the real wiring check fail",
    wiringMutant.status !== 0
      && wiringFails.some((line) => /npm test includes the isolated client boot-graph regression/.test(line)),
    `exit ${wiringMutant.status}; FAIL lines:\n${wiringFails.join("\n")}`,
  );
} finally {
  if (wiringMutantDir) cleanUp(wiringMutantDir);
}

done();