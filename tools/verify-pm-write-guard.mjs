// Replays the real pm-write-guard logic against fake `write`/`edit` tool calls,
// so the whitelist can be checked without running dsh. Run it with:
//   node tools/verify-pm-write-guard.mjs
//
// It mounts host/pm-write-guard.js with a fake Cordis context that captures the
// `tools/execute` handler and supplies a fake `approval` service, and points the
// job-state folder at a temporary path so your own ~/.dsh is never read or
// written. Most cases run with nothing on disk — the guard classifies a path
// by the realpath of its nearest existing ancestor, which is the path itself
// when nothing exists. The normalization cases (Phase 8) create real files and
// symlinks on purpose.

import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import * as guard from "../host/pm-write-guard.js";

const workdir = mkdtempSync(join(tmpdir(), "crew-pm-write-guard-"));
const jobsDir = join(workdir, "jobs");
const repoRoot = join(workdir, "repo");

const ALLOWED = Symbol("allowed");

/**
 * A fake approval service that records every request and answers one scripted
 * outcome (a constant, or a function of the request).
 */
function fakeApproval(scripted) {
  const requests = [];
  return {
    requests,
    async request(req) {
      requests.push(req);
      return typeof scripted === "function" ? scripted(req) : scripted;
    },
  };
}

/** Mount the guard once and capture its `tools/execute` handler. */
function mount(approval, config = {}) {
  let handler;
  guard.apply(
    {
      on: (event, fn) => { if (event === "tools/execute") handler = fn; },
      get: (key) => (key === "approval" ? approval : undefined),
    },
    { jobsDir, ...config },
  );
  return handler;
}

/** Run one write/edit call through the guard as the ROOT agent (the PM, no parent). */
async function runRoot(handler, name, filePath, extras = {}) {
  const { cwd = repoRoot, ...rest } = extras;
  const result = await handler(
    {
      name,
      arguments: { file_path: filePath, content: "x" },
      agent: { session: { header: { cwd } } },
      callId: "call-root",
      signal: undefined,
      ...rest,
    },
    () => ALLOWED,
  );
  return result === ALLOWED ? ALLOWED : result.error.message;
}

/** Run one write/edit call through the guard as a CREW ROLE (a child, with a parent). */
async function runChild(handler, name, filePath) {
  const result = await handler(
    {
      name,
      arguments: { file_path: filePath, content: "x" },
      agent: { session: { header: { cwd: repoRoot } } },
      parent: {},
      callId: "call-child",
      signal: undefined,
    },
    () => ALLOWED,
  );
  return result === ALLOWED ? ALLOWED : result.error.message;
}

let failures = 0;

try {
  // --- Phase 1: the PM's whitelist passes through WITHOUT asking. ---
  // An approval service that would REJECT is mounted: a whitelist write must
  // never reach it, so a whitelist path is allowed by the guard itself.
  const rejecting = fakeApproval("rejected");
  const whitelistHandler = mount(rejecting);

  const whitelistCases = [
    ["write", "roles/pm.md", "the PM's own rules file"],
    ["write", "docs/design/tasks.md", "the task table, whole file (PRD 附记A coarse grant)"],
    ["edit", "docs/design/tasks.md", "editing the task table"],
    ["write", "docs/design/prd-2026-08-23-pm-write-guard.md", "the opening document"],
    ["write", "docs/decisions/crd/0001-something.md", "a change request document"],
    ["write", "docs/decisions/adr/0001-something.md", "a decision record"],
    ["write", "docs/qa/run-all.sh", "the shared QA runner"],
    ["write", "docs/qa/gaps.md", "the standing gap list"],
    ["write", "CLAUDE.md", "the project's own rules file"],
    ["write", "principles.md", "the crew principles file"],
    ["write", join(jobsDir, "my-job", "state.json"), "the job state file, outside the repo"],
    ["write", join(repoRoot, "roles", "pm.md"), "an absolute path to a whitelist file"],
  ];
  for (const [name, path, note] of whitelistCases) {
    const before = rejecting.requests.length;
    const result = await runRoot(whitelistHandler, name, path);
    const asked = rejecting.requests.length - before;
    if (result !== ALLOWED) {
      failures += 1;
      console.error(`FAIL  ${name} ${path}\n      expected allowed without approval (${note}), got blocked: ${result}`);
    } else if (asked !== 0) {
      failures += 1;
      console.error(`FAIL  ${name} ${path}\n      expected NO approval ask for a whitelist path (${note}), got ${asked} ask(s)`);
    } else {
      console.log(`ok    allowed  ${name} ${path} (${note})`);
    }
  }

  // --- Phase 2: protected paths are blocked, and each block asks the user. ---
  // The approval service rejects, so every protected write is refused AND the
  // request is recorded: the guard triggers the approval channel, it does not
  // silently refuse.
  const rejecting2 = fakeApproval("rejected");
  const protectedHandler = mount(rejecting2);

  const protectedCases = [
    ["write", "roles/engineer.md", "another role's rules file"],
    ["write", "roles/qa.md", "another role's rules file"],
    ["write", "src/foo.js", "product code"],
    ["write", "host/pm-write-guard.js", "host plugin code"],
    ["write", "tools/verify-pm-write-guard.mjs", "a tool script"],
    ["edit", "tools/verify-mount.mjs", "editing a tool script"],
    ["write", "docs/design/api/web-auth.md", "an interface contract"],
    ["write", "docs/design/tasks-notes.md", "a file next to the task table, not the table itself"],
    ["write", "docs/qa/T-01/case-01-login.mjs", "a QA case"],
    ["write", "docs/qa/T-01/run.sh", "a QA task's own runner (not the shared run-all.sh)"],
    ["write", "README.md", "a reader-facing file (not on the PM whitelist)"],
    ["write", join(repoRoot, "docs", "design", "api", "web-auth.md"), "an absolute path to a contract"],
    ["write", join(jobsDir, "my-job", "inbox", "Q-01.md"), "a job-folder file other than state.json"],
  ];
  for (const [name, path, note] of protectedCases) {
    const before = rejecting2.requests.length;
    const result = await runRoot(protectedHandler, name, path);
    const asked = rejecting2.requests.length - before;
    if (result === ALLOWED) {
      failures += 1;
      console.error(`FAIL  ${name} ${path}\n      expected blocked (${note}), got allowed`);
      continue;
    }
    if (asked !== 1) {
      failures += 1;
      console.error(`FAIL  ${name} ${path}\n      expected exactly one approval ask (${note}), got ${asked}`);
      continue;
    }
    const req = rejecting2.requests[rejecting2.requests.length - 1];
    if (req.toolName !== name || req.callId !== "call-root" || req.agent === undefined || !req.reason.includes(path)) {
      failures += 1;
      console.error(`FAIL  ${name} ${path}\n      the approval request does not name this write (${note}): ${JSON.stringify(req)}`);
      continue;
    }
    console.log(`ok    blocked ${name} ${path} (${note}; approval asked)`);
  }

  // The refusal the model sees names the guard, the path and the user's decision.
  const blockedMessage = await runRoot(protectedHandler, "write", "src/foo.js");
  if (blockedMessage === ALLOWED
    || !blockedMessage.includes("pm-write-guard blocked")
    || !blockedMessage.includes("src/foo.js")
    || !/rejected|approval/i.test(blockedMessage)) {
    failures += 1;
    console.error(`FAIL  the refusal message is not actionable: ${String(blockedMessage)}`);
  } else {
    console.log("ok    blocked  the refusal names the guard, the path and the user's decision");
  }

  // --- Phase 3: an approved write goes through ONCE; the next write asks again. ---
  const granted = fakeApproval("allowed-once");
  const grantedHandler = mount(granted);

  const first = await runRoot(grantedHandler, "write", "roles/engineer.md");
  if (first !== ALLOWED) {
    failures += 1;
    console.error(`FAIL  an approved write was still blocked: ${first}`);
  } else if (granted.requests.length !== 1) {
    failures += 1;
    console.error(`FAIL  an approved write did not ask exactly once: ${granted.requests.length} ask(s)`);
  } else {
    console.log("ok    allowed  write roles/engineer.md (approval granted, allowed once)");
  }

  const second = await runRoot(grantedHandler, "write", "roles/engineer.md");
  if (second !== ALLOWED) {
    failures += 1;
    console.error(`FAIL  the second approved write was blocked: ${second}`);
  } else if (granted.requests.length !== 2) {
    failures += 1;
    console.error(`FAIL  the second write did not ask separately: ${granted.requests.length} ask(s)`);
  } else {
    console.log("ok    allowed  write roles/engineer.md (every write is asked for separately)");
  }

  // --- Phase 4: crew roles are NOT guarded. ---
  // Even an approval service that would REJECT must never be reached: a crew
  // role writing its own task's files passes straight through the guard.
  const childApproval = fakeApproval("rejected");
  const childHandler = mount(childApproval);

  const childCases = [
    ["write", "src/foo.js", "product code"],
    ["write", "roles/engineer.md", "another role's rules file"],
    ["write", "docs/qa/T-02/case-01.mjs", "a QA case"],
    ["edit", "host/roles.js", "host code"],
    ["write", join(jobsDir, "my-job", "state.json"), "the job state file"],
  ];
  for (const [name, path, note] of childCases) {
    const result = await runChild(childHandler, name, path);
    if (result !== ALLOWED) {
      failures += 1;
      console.error(`FAIL  a crew role's ${name} ${path} was blocked (${note}): ${result}`);
    } else {
      console.log(`ok    allowed  crew role ${name} ${path} (${note})`);
    }
  }
  if (childApproval.requests.length !== 0) {
    failures += 1;
    console.error("FAIL  a crew role's write reached the approval channel");
  } else {
    console.log("ok    crew role writes never reach the approval channel");
  }

  // --- Phase 5: only write/edit are intercepted. ---
  const readResult = await runRoot(protectedHandler, "read", "roles/engineer.md");
  if (readResult !== ALLOWED) {
    failures += 1;
    console.error(`FAIL  reading a protected path was blocked: ${readResult}`);
  } else {
    console.log("ok    allowed  read roles/engineer.md (reading is never blocked)");
  }

  const bashResult = await protectedHandler(
    { name: "bash", arguments: { command: "git status" }, agent: { session: { header: { cwd: repoRoot } } }, callId: "call-bash", signal: undefined },
    () => ALLOWED,
  );
  if (bashResult !== ALLOWED) {
    failures += 1;
    console.error(`FAIL  a bash call was blocked by the pm-write-guard: ${bashResult.error?.message ?? bashResult}`);
  } else {
    console.log("ok    allowed  bash git status (shell calls are git-guard's, not this guard's)");
  }

  // --- Phase 6: no approval service composed -> fail closed. ---
  const noApprovalHandler = mount(undefined);
  const noChannel = await runRoot(noApprovalHandler, "write", "src/foo.js");
  if (noChannel === ALLOWED) {
    failures += 1;
    console.error("FAIL  a protected write ran although no approval channel is composed");
  } else if (!/approval/.test(noChannel)) {
    failures += 1;
    console.error(`FAIL  the no-channel refusal does not say so: ${noChannel}`);
  } else {
    console.log("ok    blocked  protected write with no approval service (fail closed)");
  }

  // --- Phase 7: the caller's abort signal is forwarded to the approval request. ---
  const signalApproval = fakeApproval("rejected");
  const signalHandler = mount(signalApproval);
  const signal = { aborted: false };
  await runRoot(signalHandler, "write", "src/foo.js", { signal });
  const lastRequest = signalApproval.requests[signalApproval.requests.length - 1];
  if (lastRequest.signal !== signal) {
    failures += 1;
    console.error("FAIL  the approval request did not carry the caller's abort signal");
  } else {
    console.log("ok    the caller's abort signal is forwarded to the approval request");
  }

  // --- Phase 8: path normalization is real, not textual (security review). ---
  // A symlink whose name looks whitelisted must not smuggle a protected file
  // past the whitelist: docs/design/CLAUDE.md -> ../../roles/engineer.md is
  // the reviewer's exact example.
  mkdirSync(join(repoRoot, "roles"), { recursive: true });
  writeFileSync(join(repoRoot, "roles", "engineer.md"), "engineer rules");
  mkdirSync(join(repoRoot, "docs", "design"), { recursive: true });
  symlinkSync("../../roles/engineer.md", join(repoRoot, "docs", "design", "CLAUDE.md"));

  const normApproval = fakeApproval("rejected");
  const normHandler = mount(normApproval);

  const symlinkWrite = await runRoot(normHandler, "write", "docs/design/CLAUDE.md");
  const realTarget = join(repoRoot, "roles", "engineer.md");
  if (symlinkWrite === ALLOWED) {
    failures += 1;
    console.error("FAIL  a write through a symlink named CLAUDE.md was whitelisted without approval");
  } else if (normApproval.requests.length !== 1) {
    failures += 1;
    console.error(`FAIL  the symlinked write did not ask the user exactly once: ${normApproval.requests.length} ask(s)`);
  } else {
    console.log("ok    blocked  write docs/design/CLAUDE.md (a symlink to roles/engineer.md, classified by realpath)");
    // The prompt and the refusal must name the file the write REALLY touches:
    // approving a harmless-looking typed name must not hide the real target.
    const req = normApproval.requests[0];
    if (!req.reason.includes(realTarget)) {
      failures += 1;
      console.error(`FAIL  the approval prompt does not name the REAL target ${realTarget}: ${req.reason}`);
    } else if (!req.reason.includes("docs/design/CLAUDE.md")) {
      failures += 1;
      console.error("FAIL  the approval prompt no longer names the typed path either");
    } else if (!symlinkWrite.includes(realTarget)) {
      failures += 1;
      console.error(`FAIL  the refusal message does not name the REAL target ${realTarget}: ${symlinkWrite}`);
    } else {
      console.log("ok    the approval prompt and the refusal name the real target (roles/engineer.md) and the typed path");
    }
  }

  // A `..` path into a protected file: blocked and asked.
  const beforeParent = normApproval.requests.length;
  const parentIntoProtected = await runRoot(normHandler, "write", "../src/foo.js", { cwd: join(repoRoot, "docs") });
  if (parentIntoProtected === ALLOWED) {
    failures += 1;
    console.error("FAIL  a `..` path into product code was allowed");
  } else if (normApproval.requests.length - beforeParent !== 1) {
    failures += 1;
    console.error(`FAIL  the \`..\` path into product code did not ask exactly once: ${normApproval.requests.length - beforeParent}`);
  } else {
    console.log("ok    blocked  write ../src/foo.js from repo/docs (a `..` path into product code, approval asked)");
  }

  // A `..` path that normalizes onto a whitelist entry: allowed, no ask.
  const beforeWhitelist = normApproval.requests.length;
  const parentOntoWhitelist = await runRoot(normHandler, "write", "../../roles/pm.md", { cwd: join(repoRoot, "docs", "design") });
  if (parentOntoWhitelist !== ALLOWED) {
    failures += 1;
    console.error(`FAIL  a \`..\` path onto the PM's own rules file was blocked: ${parentOntoWhitelist}`);
  } else if (normApproval.requests.length - beforeWhitelist !== 0) {
    failures += 1;
    console.error("FAIL  a `..` path onto a whitelist entry reached the approval channel");
  } else {
    console.log("ok    allowed  write ../../roles/pm.md from repo/docs/design (`..` onto the PM's rules file, no ask)");
  }

  // An absolute path outside the repository: asked.
  const beforeAbsolute = normApproval.requests.length;
  const outsideRepo = await runRoot(normHandler, "write", "/etc/passwd");
  if (outsideRepo === ALLOWED) {
    failures += 1;
    console.error("FAIL  a write to an absolute path outside the repo was allowed without approval");
  } else if (normApproval.requests.length - beforeAbsolute !== 1) {
    failures += 1;
    console.error(`FAIL  the out-of-repo write did not ask exactly once: ${normApproval.requests.length - beforeAbsolute}`);
  } else {
    console.log("ok    blocked  write /etc/passwd (outside the repo, approval asked)");
  }

  // A symlinked session cwd with a `..` path: the cwd is realpath'd exactly
  // when dsh resolves it, so a state.json cannot land outside the jobs dir
  // with no approval. jobsDir here is home/jobs — the TEXTUAL resolution of
  // "../jobs/my-job/state.json" from cwd home/project-link (a symlink to
  // elsewhere/project) lands inside home/jobs (whitelisted), while the real
  // resolution — what dsh actually writes — lands at elsewhere/jobs, outside.
  mkdirSync(join(workdir, "elsewhere", "project"), { recursive: true });
  mkdirSync(join(workdir, "home"), { recursive: true });
  symlinkSync(join(workdir, "elsewhere", "project"), join(workdir, "home", "project-link"));

  const symlinkCwdApproval = fakeApproval("rejected");
  const symlinkCwdHandler = mount(symlinkCwdApproval, { jobsDir: join(workdir, "home", "jobs") });
  const symlinkCwdState = await runRoot(
    symlinkCwdHandler,
    "write",
    "../jobs/my-job/state.json",
    { cwd: join(workdir, "home", "project-link") },
  );
  if (symlinkCwdState === ALLOWED) {
    failures += 1;
    console.error("FAIL  a state.json through a symlinked cwd was whitelisted (its real target lands outside the jobs dir)");
  } else if (symlinkCwdApproval.requests.length !== 1) {
    failures += 1;
    console.error(`FAIL  the symlinked-cwd state.json did not ask exactly once: ${symlinkCwdApproval.requests.length}`);
  } else {
    console.log("ok    blocked  write ../jobs/my-job/state.json through a symlinked cwd (canonicalized like dsh, approval asked)");
  }

  // --- Phase 9: enabled:false turns the guard off completely. ---
  let registered = false;
  guard.apply({ on: () => { registered = true; }, get: () => undefined }, { jobsDir, enabled: false });
  if (registered) {
    failures += 1;
    console.error("FAIL  enabled:false still registered a tools/execute handler");
  } else {
    console.log("ok    enabled:false registers nothing (guard off)");
  }
} finally {
  rmSync(workdir, { recursive: true, force: true });
}

console.log(failures === 0 ? "\nall pm-write-guard checks passed" : `\n${failures} pm-write-guard check(s) failed`);
process.exit(failures === 0 ? 0 : 1);
