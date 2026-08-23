// dsh-crew PM write guard (host side).
//
// Stops the root agent — your own session, the PM — from using the `write` and
// `edit` tools on files that belong to crew roles. It exists for the same
// reason the git guard does: a role rule written in prose is advice, while a
// `tools/execute` wrapper is the place a call is actually stopped. The PM has
// repeatedly edited files it was not allowed to edit and added a task row
// afterwards; this guard makes that impossible instead of merely forbidden.
//
// What it does:
//   - only the ROOT agent (the PM) is guarded. Every crew role carries a
//     parent execution token and passes straight through — a role writing its
//     own task's files is the normal flow and is never touched.
//   - only the `write` and `edit` tools are intercepted; everything else runs
//     unhindered.
//   - a path on the PM's whitelist passes straight through, no approval asked.
//     The whitelist is hard-coded here (and pinned by
//     tools/verify-pm-write-guard.mjs), exactly as the PRD decided: it is NOT
//     read from the task table (`docs/tasks/`), so a change to the rules text
//     cannot move the guard.
//   - any other path is refused, and the refusal goes through dsh's OWN
//     user-approval channel: `ctx.approval.request(...)` shows the user the
//     approval prompt in the GUI. The user approves THIS one write (the write
//     then runs), or rejects/cancels it (the write is refused); every write is
//     asked for separately. The prompt and the refusal name the REAL target
//     (symlinks resolved), with the typed path in parentheses when the two
//     differ — approving "write X" is approving the file X really touches.
//     This is the same seam dsh itself uses for sandbox
//     escalation (`approveEscalation` in @deepseek-ai/dsh-sandbox) and for
//     `tools/pre-execute` ask gates — the middleware has the agent, the call id
//     and the signal, so it can drive the approval service directly.
//
// The whitelist (PRD `PM 可写` section, mapped to paths):
//   - docs/design/prd-*.md                the opening document of a job
//   - docs/decisions/crd/*.md             change request documents
//   - docs/decisions/adr/*.md             decision records
//   - docs/tasks/                         the task table, one file per task (PRD
//                                        附记A coarse grant: the PM writes both
//                                        the Verdicts line and small-work rows)
//   - docs/qa/run-all.sh                  the shared QA runner
//   - docs/qa/gaps.md                     the standing gap list
//   - CLAUDE.md, principles.md            the project rules and the principles
//   - roles/pm.md                         the PM's own rules file
//   - <jobsDir>/*/state.json              the job state file, outside the repo
//
// Everything else — product code under src/ host/ tools/, the other roles'
// rule files, the interface contracts under docs/design/api/, QA's cases under
// docs/qa/T-*/ and their run.sh files, the READMEs, package.json — is refused
// and asked to the user.
//
// Honest limits, same kind the git guard carries:
//   - It reads the file_path TEXT of write/edit tool calls, and only those two
//     tools. A file written through a shell command (`echo x > file`) never
//     passes through this middleware — that lane is the git guard's territory
//     and the playbook's, not this guard's. It is a strong seat belt, not a
//     locked door; dsh's own approval prompts remain the real gate.
//   - Paths are matched by the normalized segments of the REALPATH'd target
//     (the nearest existing ancestor is realpath'd and the missing tail is
//     re-attached, since the final component may not exist yet on create), so
//     the repo-root-relative whitelist works wherever the repository lives and
//     a symlink or `..` cannot smuggle a protected file past it. The price: a
//     path whose FINAL segment is `CLAUDE.md`, `principles.md` or `roles/pm.md`
//     and whose existing ancestors are not symlinks is whitelisted wherever it
//     sits. That is a deliberate trade: the guard exists to stop the PM
//     stepping on THIS repository's layout, not to fence a hostile agent, and
//     the user still approves everything not whitelisted.
//   - A deployment that composes no approval service fails closed: the write is
//     refused with a clear message instead of being allowed (the same degrade
//     dsh's own `tools/pre-execute` ask gates use).

import { realpathSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";

import { expandHome } from "./roles.js";

export const name = "dsh-crew-pm-write-guard";
export const inject = ["tools"];

/** The tools whose file target this guard reads. */
const WRITE_TOOLS = new Set(["write", "edit"]);

/** Default job-state folder (configurable so the checks never touch the real ~/.dsh). */
const DEFAULT_JOBS_DIR = join(homedir(), ".dsh", "crew", "jobs");

/**
 * Normalize a path into its segments, dropping empty ones, so every whitelist
 * rule can be written against a stable shape on any platform.
 */
function segmentsOf(target) {
  return resolve(target).split(/[\\/]+/).filter((segment) => segment.length > 0);
}

/** Whether `segments` ends with `tail`, segment by segment. */
function endsWith(segments, tail) {
  if (segments.length < tail.length) return false;
  const offset = segments.length - tail.length;
  return tail.every((part, index) => segments[offset + index] === part);
}

/** A `..` path segment — the same pattern dsh-tool-fs's sessionCwd uses. */
const PARENT_PATH_SEGMENT = /(?:^|[\\/])\.\.(?:[\\/]|$)/;

/** realpath, falling back to the text path on failure — dsh's canonicalPath, copied exactly. */
function canonicalPath(path) {
  try {
    return realpathSync.native(path);
  } catch {
    return path;
  }
}

/**
 * Realpath the nearest EXISTING ancestor and re-attach the missing tail. The
 * final component of a write target may not exist yet (create), so realpathing
 * the whole path would throw; walking up to the first existing ancestor still
 * resolves every symlink that IS on disk, which is what dsh-fs does before the
 * atomic write. Without this, `ln -s roles/engineer.md docs/design/CLAUDE.md`
 * makes a write to `docs/design/CLAUDE.md` classify as "pm" by its final
 * segment and silently overwrite the engineer's rules file.
 */
function realpathOf(target) {
  const missing = [];
  let cursor = target;
  for (;;) {
    try {
      const real = realpathSync.native(cursor);
      return missing.length === 0 ? real : join(real, ...missing.reverse());
    } catch {
      const parent = dirname(cursor);
      if (parent === cursor) return target;
      missing.push(basename(cursor));
      cursor = parent;
    }
  }
}

/** Whether the path is a `state.json` somewhere under the job-state folder. */
function isJobStateFile(segments, jobsDir) {
  // Both sides canonical, or a symlinked home makes a real target never match
  // its textual jobsDir (and vice versa).
  const dirSegments = segmentsOf(canonicalPath(jobsDir));
  if (segments.length <= dirSegments.length) return false;
  for (let index = 0; index < dirSegments.length; index += 1) {
    if (segments[index] !== dirSegments[index]) return false;
  }
  return segments[segments.length - 1] === "state.json";
}

/**
 * Classify one write target: "pm" when the PM may write it without asking,
 * "protected" otherwise. The whitelist is hard-coded, per the PRD — it is not
 * read from the task table (`docs/tasks/`), so a change to the rules text
 * cannot move the guard. The
 * target is REALPATHD first (see realpathOf), so a symlink or `..` in the
 * path cannot smuggle a protected file past the whitelist.
 */
function classifyWrite(target, jobsDir) {
  const segments = segmentsOf(realpathOf(target));
  const last = segments[segments.length - 1];
  const parent = segments.slice(0, -1);

  // The opening document of a job: docs/design/prd-<date>-<slug>.md
  if (endsWith(parent, ["docs", "design"]) && /^prd-.+\.md$/.test(last)) return "pm";
  // Change requests and decision records.
  if (endsWith(parent, ["docs", "decisions", "crd"]) && last.endsWith(".md")) return "pm";
  if (endsWith(parent, ["docs", "decisions", "adr"]) && last.endsWith(".md")) return "pm";
  // The task table: one file per task under docs/tasks/ (PRD 附记A coarse
  // grant — the PM writes the Verdicts line on every row and small-work rows).
  if (endsWith(parent, ["docs", "tasks"])) return "pm";
  // The shared QA runner and the standing gap list.
  if (endsWith(segments, ["docs", "qa", "run-all.sh"])) return "pm";
  if (endsWith(segments, ["docs", "qa", "gaps.md"])) return "pm";
  // The project rules file, the principles, the PM's own rules file.
  if (last === "CLAUDE.md") return "pm";
  if (last === "principles.md") return "pm";
  if (endsWith(segments, ["roles", "pm.md"])) return "pm";
  // The job state file, outside the repository.
  if (isJobStateFile(segments, jobsDir)) return "pm";

  return "protected";
}

/** Deny the call with a message the model can act on. */
function block(reason) {
  const message = `dsh-crew pm-write-guard blocked this write: ${reason}`;
  return {
    content: [{ type: "text", text: `Error: ${message}` }],
    isError: true,
    error: { message, info: { name: "CrewPmWriteGuardError", code: "CREW_PM_WRITE_BLOCKED" } },
  };
}

/**
 * Name a write target the way the user must read it: the REAL path first — the
 * file the write actually touches once symlinks are resolved — with the typed
 * path in parentheses only when the two differ. A prompt that shows only the
 * typed path would let a user approve a harmless-looking `docs/design/CLAUDE.md`
 * that is really a symlink to `roles/engineer.md`.
 */
function describeTarget(target, real) {
  return real === target ? `"${target}"` : `"${real}" (the PM typed "${target}")`;
}

/** What the user is asked to approve. */
function approvalReason(target, real) {
  return `dsh-crew pm-write-guard: the PM wants to write ${describeTarget(target, real)}, `
    + `which is not on the PM's whitelist. `
    + `Approve to allow THIS one write; every write is asked separately. `
    + `If this path should be writable by the PM as a rule, the whitelist has to change through the normal `
    + `document process (a PRD/CRD), not by approving writes one by one.`;
}

/** The refusal text after the user's answer (or the fail-closed fallback). */
function writeRefusal(target, real, outcome) {
  const base = `the PM may not write ${describeTarget(target, real)} — it is not on the PM's whitelist. `
    + `The user can approve THIS one write in the approval prompt; every write is asked for separately.`;
  switch (outcome) {
    case "rejected": return `${base} The user rejected this write.`;
    case "cancelled": return `${base} The approval prompt was cancelled.`;
    case "unavailable": return `${base} No approval channel is available, so the write fails closed.`;
    default: return base;
  }
}

/**
 * Ask the user through dsh's own approval channel, exactly the way dsh's
 * sandbox escalation does (`approveEscalation`): the middleware holds the
 * agent, the call id and the signal, and closes over `ctx.approval.request`.
 * Missing service or agent, or a throwing request, degrade to "unavailable" —
 * the write then fails closed instead of silently running.
 */
async function askApproval(ctx, exec, target, real) {
  const approval = ctx.get("approval");
  if (approval === undefined || exec.agent === undefined) return "unavailable";
  try {
    return await approval.request({
      agent: exec.agent,
      toolName: exec.name,
      callId: exec.callId,
      reason: approvalReason(target, real),
      ...(exec.signal !== undefined ? { signal: exec.signal } : {}),
    });
  } catch {
    return "unavailable";
  }
}

/**
 * Resolve the target the way the fs tools themselves do: relative paths are
 * relative to the session cwd, and the cwd is realpath'd exactly when
 * dsh-tool-fs's sessionCwd realpaths it — when the cwd OR the requested path
 * contains a `..` segment. Otherwise a symlinked cwd makes `..` resolve against
 * a different base than dsh actually writes to, and a `state.json` could land
 * outside the jobs dir while this guard classified it as the whitelisted file.
 */
function resolveWritePath(filePath, exec) {
  const cwd = exec.agent?.session?.header?.cwd;
  if (cwd === undefined) return resolve(filePath);
  const base = PARENT_PATH_SEGMENT.test(cwd) || PARENT_PATH_SEGMENT.test(filePath)
    ? canonicalPath(cwd)
    : cwd;
  return resolve(base, filePath);
}

export function apply(ctx, config) {
  if (config?.enabled === false) return;

  // Configurable so the checks can exercise the job-state rule without touching
  // the real ~/.dsh/crew/jobs (see tools/verify-pm-write-guard.mjs).
  const jobsDir = config?.jobsDir ? expandHome(config.jobsDir) : DEFAULT_JOBS_DIR;

  ctx.on("tools/execute", async (exec, next) => {
    // Only the root agent — your own session, the PM — is guarded. Every crew
    // role carries a parent execution token and writes its own task's files
    // unhindered.
    if (exec.parent !== undefined) return next();

    if (!WRITE_TOOLS.has(exec.name)) return next();

    const filePath = exec.arguments?.file_path;
    if (typeof filePath !== "string" || filePath.length === 0) return next();

    const target = resolveWritePath(filePath, exec);
    if (classifyWrite(target, jobsDir) === "pm") return next();

    // A protected write: ask the user through dsh's approval channel. The user
    // approves this ONE write; every write is asked for separately. The real
    // target (symlinks resolved) is what the prompt and the refusal name, so
    // approving "write X" is approving the file X really touches.
    const real = realpathOf(target);
    const outcome = await askApproval(ctx, exec, target, real);
    if (outcome === "allowed-once") return next();
    return block(writeRefusal(target, real, outcome));
  });
}
