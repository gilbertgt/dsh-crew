// T-64 DoD items 2, 3 and 4 (PRD M1 DoD item 6): step 1 of `roles/pm.md` states
// all three sentences the cancelled third lane was replaced with —
//
//   item 2  every change gets a milestone, however small, and that milestone
//           holds at least one task, one round of QA, and one round each of the
//           code review, the security review and the doc review;
//   item 3  a milestone is NOT a release: it is one full cycle plus one commit,
//           while pushing and tagging each still need the user's own yes — and
//           that sentence must name step 16;
//   item 4  a normal job has ONE milestone, and it is split into several only
//           when a dependency between the parts forces separate releases.
//
// AND that the two sentences this same job contradicted them with are still gone.
//
// WHY THAT LAST HALF IS PART OF THIS CASE.
// T-64 wrote item 2 into step 1, but two other places in the same file still said
// small work has no milestone at all: step 4's short-PRD paragraph and the state
// file section. The file shipped self-contradictory and stayed that way until
// T-82 fixed it (commit 60b0462) — four commits and one whole job later, found by
// a role that could not touch the file rather than by any check. Nothing was
// watching those two sentences: the engineer of T-82 searched for a pin on them
// and found none. This case is that pin, so the contradiction cannot come back
// unnoticed. Its wording now: small work has ONE milestone, the job itself, so
// the short PRD needs no section listing milestones and the state file's
// `milestones` array holds one entry rather than zero.
//
// WHY EVERY MATCH HERE IS ON FLATTENED TEXT, AND WHY THAT IS NOT A STYLE CHOICE.
// T-82's engineer counted `no milestones` twice, as this repository's rule asks:
// line by line it was 1, flattened it was 2, because step 4's sentence broke
// right after `No`. A line-based pin would have caught one of the two and let the
// other live — which is the failure mode that has shipped seven times here. So
// both banned wordings are counted on flattened, lower-cased text, and the case
// prints both counts (flattened and line-based) every run. Mutation 2 below
// re-introduces one of them ACROSS A LINE BREAK on purpose and proves the
// line-based count still reads 0 while this case goes red.
//
// The zero-counts alone would also pass on a file where the whole paragraph was
// deleted, so the two replacement sentences are pinned positively as well.
//
// WHICH FILES THIS READS (Crew V2). The subject here is the rules the package
// ships, and since V2 those are the always-loaded core `roles/pm.md` PLUS every
// playbook its index names — which is exactly what `pm()` composes. V2 moved three
// of the things judged below out of the core: the short-PRD paragraph to
// `roles/playbooks/crew-flow.md`, the state file's `milestones` wording to
// `roles/playbooks/crew-state.md`, and the long routing judgement (the delegation
// rule this case pins as `ID.reviews`) to `roles/playbooks/crew-routing.md`. A
// case that read `roles/pm.md` alone would report all of them gone while the PM
// still ships them, so every read here goes through `pm()` — and where the check
// needs one particular home, it reads that playbook by name.
//
// The same rule binds the two mutations at the bottom: each one edits the file its
// anchor really lives in and reads the copy back through `composePmRulesIn(dir)`.
// Reading the core alone after planting a sentence in a playbook would leave the
// copy's composed text unchanged, the audit green, and the case reporting a pass
// for a pin it never touched.
//
// Writes nothing outside throwaway copies of the repository, which it removes again.

import { pm, section, step, flat, check, done, tempRepo, cleanUp, copyFile, composePmRulesIn, edit, rulesFile } from "../lib/qa.mjs";

const HEADING = "Pick a lane and route";
const PUSH_STEP = 16;

// V2: the delegation rule left the core's step 1 for the routing playbook, which
// is where the core's index sends the PM when the short routing form is not enough.
const ROUTING_PLAYBOOK = "roles/playbooks/crew-routing.md";

// The two wordings T-82 removed. Neither may come back, in any capitalisation.
const BANNED = ["small work has none", "small work has no milestones"];

// -------------------------------------------------------------------- counting

/** How often `phrase` appears, flattened and line by line, ignoring case. */
function counts(text, phrase) {
  const needle = phrase.toLowerCase();
  return {
    flattened: flat(text).toLowerCase().split(needle).length - 1,
    byLine: text.toLowerCase().split("\n").filter((line) => line.includes(needle)).length,
  };
}

/** `width` characters of flattened text starting at `anchor`, or "" when absent. */
function windowAfter(flatText, anchor, width) {
  const at = flatText.indexOf(anchor);
  return at === -1 ? "" : flatText.slice(at, at + width);
}

// ------------------------------------------------------------------- the audit
//
// One pure function over the file's text, so the very same judgement can be run
// against a deliberately broken copy further down. A case that asserts on the
// real file with one body of code and proves it can fail with another is proving
// nothing about the code that runs in the suite.

const ID = {
  section: `roles/pm.md still has a "## ${HEADING}" section`,
  gets: "step 1 says every change gets a milestone, however small",
  contents: "the direct scale starts no child role and keeps one test and one commit",
  reviews: "roles and reviews are started only when their subject changed",
  notRelease: "step 1 says a milestone is not a release",
  cycle: "a milestone is one full cycle plus one commit",
  yes: "pushing and tagging each still need the user's own yes",
  // V2 moved the route-neutral core off the crew flow's step numbers: this
  // sentence states the permission itself. The assertion moved with the rule
  // instead of being widened — it now asks for the rule AND for the absence of a
  // step pointer, which the old one-step-name check could not see.
  ownYes: "that sentence states the permission itself and names no crew step",
  step16: `step ${PUSH_STEP} really is the push step of the crew flow`,
  one: "a normal job has one milestone",
  split: "several milestones only when a dependency forces separate releases",
  shortPrd: "the short PRD says small work has one milestone, this job itself",
  stateFile: "the state file's `milestones` array holds one entry for small work",
};
const banned = (phrase) => `the cancelled wording "${phrase}" is gone from the PM rules`;

function audit(text, routing) {
  const results = [];
  const add = (id, ok, detail = "") => results.push({ id, ok, detail });

  let laneSection = null;
  let sectionError = "";
  try {
    laneSection = section(text, HEADING);
  } catch (error) {
    sectionError = String(error?.message ?? error);
  }
  add(
    ID.section,
    laneSection !== null,
    `${sectionError} — step 1 moved or was renamed, so the three sentences could not be judged where T-64 put them`,
  );

  const lane = flat(laneSection ?? "");

  // --- DoD item 2 -----------------------------------------------------------
  const getsOne = windowAfter(lane, "it gets a milestone", 320);
  add(
    ID.gets,
    getsOne !== "",
    'step 1 nowhere says "it gets a milestone"; T-64 DoD item 2 asks for the rule that '
      + "replaced the cancelled lane — no change is too small for a milestone",
  );
  add(
    ID.contents,
    /`direct` — \*\*the default for a small, low-risk change\.\*\*/i.test(lane)
      && /start \*\*no\*\* child role/i.test(lane)
      && /one task, one test, one commit/i.test(lane),
    `the direct scale is missing its no-child, one-test, one-commit guard: ${JSON.stringify(lane.slice(0, 500))}`,
  );
  add(
    ID.reviews,
    // Read where the rule lives now, not where it used to: V2 put the long routing
    // judgement — including this delegation line — in `crew-routing.md`, and the
    // core's step 1 only points at it. Judging the core's step 1 section alone
    // would report a shipped rule gone. The sentence is unchanged, so the check
    // still asks the same question it always asked.
    /role whose subject this change never touched is not started/i.test(routing),
    "the delegation rule does not say an unrelated role is not started: "
      + JSON.stringify(routing.slice(0, 220)),
  );

  // --- DoD item 3 -----------------------------------------------------------
  const notRelease = windowAfter(lane, "A milestone is not a release", 300);
  add(
    ID.notRelease,
    notRelease !== "",
    'step 1 nowhere says "A milestone is not a release"; without it a finished milestone reads as '
      + "something the crew may ship on its own",
  );
  add(
    ID.cycle,
    notRelease.includes("one full cycle plus one commit"),
    `the sentence does not say what a milestone IS: ${JSON.stringify(notRelease.slice(0, 220))}`,
  );
  add(
    ID.yes,
    /Pushing and tagging/i.test(notRelease) && /needs the user's own yes/i.test(notRelease),
    "the sentence does not keep pushing and tagging outside the milestone, each needing the user's own yes: "
      + JSON.stringify(notRelease.slice(0, 220)),
  );
  add(
    ID.ownYes,
    /every single time/i.test(notRelease) && !/\bstep\s*\d/i.test(notRelease),
    `the milestone sentence has to state that each yes stands on its own, and name no crew step — a \`direct\` or \`solo\` job reading one would have to open the crew flow to find it: `
      + JSON.stringify(notRelease.slice(0, 220)),
  );

  // The crew flow's own push step is still worth pinning on its own: a
  // renumbering that left the digits behind would send that route's reader to the
  // wrong place, and nothing else checks the number against what it contains.
  let pushStep = "";
  try {
    pushStep = flat(step(text, PUSH_STEP));
  } catch (error) {
    pushStep = "";
  }
  add(
    ID.step16,
    /Push/i.test(pushStep) && /permission/i.test(pushStep),
    `step ${PUSH_STEP} of the crew flow is not about pushing with the user's permission: `
      + JSON.stringify(pushStep.slice(0, 160)),
  );

  // --- DoD item 4 -----------------------------------------------------------
  const normal = /A normal job has \*{0,2}one\*{0,2} milestone/.exec(lane);
  add(
    ID.one,
    normal !== null,
    "step 1 does not say a normal job has one milestone (CRD 0023 decision four), so a job could be "
      + "cut into milestones for no reason",
  );
  const splitWindow = normal === null ? "" : lane.slice(normal.index, normal.index + 320);
  add(
    ID.split,
    /Split into more only when a dependency/i.test(splitWindow) && /separate releases/i.test(splitWindow),
    "the one exception is not written down — several milestones only when a dependency between the "
      + `parts forces separate releases: ${JSON.stringify(splitWindow.slice(0, 220))}`,
  );

  // --- the contradiction T-82 removed --------------------------------------
  for (const phrase of BANNED) {
    const seen = counts(text, phrase);
    add(
      banned(phrase),
      seen.flattened === 0,
      `${seen.flattened} occurrence(s) flattened, ${seen.byLine} line by line. This is the sentence `
        + "T-82 removed because it contradicts step 1. A flattened count above a line-based one means "
        + "the sentence wraps, and every line-based grep for it is lying.",
    );
  }

  // The two sentences that replaced them, so deleting the paragraph outright
  // cannot turn the two counts above green.
  const whole = flat(text);
  add(
    ID.shortPrd,
    whole.includes("small work has **one** milestone, this job itself"),
    "step 4's short-PRD paragraph no longer says small work has one milestone, the job itself — "
      + "the half of T-82's fix that keeps a short PRD from needing a milestone list",
  );
  add(
    ID.stateFile,
    /Small work has \*{0,2}one\*{0,2} milestone, so its `milestones` array holds one entry/.test(whole),
    "the state file section no longer says small work's `milestones` array holds one entry rather "
      + "than zero — the other half of T-82's fix",
  );

  return results;
}

// ------------------------------------------------------------- the real files
//
// `pm()` is the core plus every playbook — the rules the package ships. The one
// check that has to know WHICH home the rule sits in reads that file by name.

const text = pm();
const routing = flat(rulesFile(ROUTING_PLAYBOOK));

for (const phrase of BANNED) {
  const seen = counts(text, phrase);
  console.log(`      "${phrase}" in the PM rules: ${seen.flattened} flattened, ${seen.byLine} line by line`);
}

for (const result of audit(text, routing)) check(result.id, result.ok, result.detail);

// -------------------------------------------------------------- mutations
//
// Two breakages, each in its own throwaway copy of the repository, proving the
// audit above goes red on exactly the thing it claims to guard. Without these the
// case is a green light with no bulb in it.

/** Break one file of a fresh copy and return which audit checks failed. */
function afterBreaking(breakIt) {
  const dir = tempRepo();
  try {
    breakIt(dir);
    // The copy is judged the same way the real package is: composed, and with the
    // routing playbook read by name. `copyFile(dir, "roles/pm.md")` would have
    // judged the core alone — a mutation planted in a playbook would then sit in a
    // file this line never opened, and the audit would pass on it.
    return {
      failed: audit(composePmRulesIn(dir), flat(copyFile(dir, ROUTING_PLAYBOOK))).filter((r) => !r.ok).map((r) => r.id),
      broken: composePmRulesIn(dir),
    };
  } finally {
    cleanUp(dir);
  }
}

// Mutation 1: delete the "a milestone is not a release" sentence (DoD item 3).
const gone = afterBreaking((dir) => {
  edit(dir, "roles/pm.md", "**A milestone is not a release.** ", "");
});
check(
  "mutation 1: deleting the milestone-is-not-a-release sentence turns this case red",
  gone.failed.includes(ID.notRelease),
  `failed checks were ${JSON.stringify(gone.failed)} — the sentence was removed from the copy and `
    + "this case still passed on it",
);

// Mutation 2: put `small work has no milestones` back, WRAPPED across two lines,
// the way it really was when it hid from a line-based grep. The line-based count
// stays 0; only the flattened count sees it.
const backWrapped = afterBreaking((dir) => {
  edit(
    dir,
    // V2: the `Milestone states:` paragraph lives in `crew-state.md` now, so the
    // anchor moved with it. `edit` throws when an anchor is missing, which is what
    // caught this the moment the paragraph moved out of the core.
    "roles/playbooks/crew-state.md",
    "Milestone states: `todo`",
    "Leave `milestones` out for small work — small work has no\nmilestones.\n\nMilestone states: `todo`",
  );
});
const before = counts(text, "small work has no milestones");
const reintroduced = counts(backWrapped.broken, "small work has no milestones");
console.log(
  `      mutation 2 re-introduced it wrapped: ${reintroduced.flattened} flattened, `
    + `${reintroduced.byLine} line by line`,
);
check(
  "mutation 2: the contradiction coming back turns this case red",
  backWrapped.failed.includes(banned("small work has no milestones")),
  `failed checks were ${JSON.stringify(backWrapped.failed)}`,
);
check(
  "mutation 2: only the flattened count sees it, which is why nothing here reads line by line",
  reintroduced.flattened === before.flattened + 1 && reintroduced.byLine === before.byLine,
  `flattened ${before.flattened} -> ${reintroduced.flattened}, line by line ${before.byLine} -> `
    + `${reintroduced.byLine} — the mutation must add exactly one flattened hit and no line-based one; `
    + "a line-based count that moved means the mutation did not wrap and proves nothing about flattening",
);

done();
