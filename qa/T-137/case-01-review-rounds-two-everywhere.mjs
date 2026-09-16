// T-137 DoD item 1 ??the review-round ceiling is 2 in every place that states it,
// and the places are TIED to the runtime number instead of repeating it.
//
// The failure this guards is not a typo. `limits.reviewRounds` defaulted to 3
// while `roles/pm.md` step 10 and all three reviewer personas already said one
// issue gets round one and one re-check and no third round. The runtime number and
// the written rule disagreed: the PM was told a ceiling its own reviewers are
// forbidden to reach, and nothing went red ??because two files each held a
// number, and no check read them against each other. So the runtime default is
// READ first, and every other place has to agree with THAT number. Change one and
// this case goes red.
//
// The four places, and the reason each one is here:
//
//   host/crew.js          the number itself, the only place it is decided;
//   the PM prompt         built from that number by host/crew.js, so it is where
//                         a stale default would keep being promised to the PM;
//   cordis.patch.yml      the commented example is how this option is documented;
//   tools/verify-mount.mjs the project check that pins the prompt's sentence;
//   the PM rules          the written rule, in words ("two rounds is the whole
//                         job's ceiling") ??and it may state no other number;
//   the three reviewer personas, which already say two rounds and no third round.
//
// Two mutations prove the audit is not a green light with no bulb: setting the
// runtime default back to 3 in a copy must red the prompt check, and putting
// "three rounds" back into the rules in a copy must red the wording check.
//
// Reads the repository; writes only inside throwaway copies, which it removes.

// V2: the PM's rules are the always-loaded core plus the on-demand playbooks, so a
// case about what the rules SAY reads the composed text. `rulesFile("roles/pm.md")`
// is that text (see qa/lib/qa.mjs); reading `roles/pm.md` alone would only see the
// core and would call a rule that moved into a playbook missing. The ceiling in
// words lives in `roles/playbooks/crew-flow.md` today, so the mutation below is
// written there and read back with `composePmRulesIn(dir)` ??a mutation case that
// edited a playbook and then re-read the core alone would pass on an unchanged
// text and prove nothing.
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { check, cleanUp, composePmRulesIn, copyFile, done, edit, flat, mountCrew, rulesFile, tempRepo } from "../lib/qa.mjs";
// Crew V2: a reviewer's two-round rule is a SHARED one now ??it lives once, in
// `host/child-policy.js` as `REVIEWER_POLICY`, and reaches each reviewer through
// the composed persona. Both the real read (`rulesFile()`, below) and the
// read-back inside a broken copy go through the same composition, so a mutation
// aimed at the shared text is really judged.
import { ROLES, TAIWAN_LANGUAGE_POLICY } from "../../host/roles.js";
import { composeChildPersona } from "../../host/child-policy.js";

const ROLE_BY_PERSONA = new Map(ROLES.map((role) => [role.personaFile, role]));

/**
 * The composed persona of one reviewer, read out of a repository copy.
 *
 * The policy module is imported FROM THE COPY, not from this checkout: a mutation
 * that edits `host/child-policy.js` in the copy has to be the text the persona is
 * built from, or the case would judge an unchanged module and pass on a breakage.
 * The query string defeats Node's module cache, which is keyed by URL.
 */
async function personaIn(dir, relative) {
  const role = ROLE_BY_PERSONA.get(relative.slice("roles/".length));
  if (role === undefined) return copyFile(dir, relative);
  const policy = await import(`${pathToFileURL(join(dir, "host", "child-policy.js")).href}?copy=${encodeURIComponent(dir)}`);
  return policy.composeChildPersona({
    roleText: copyFile(dir, relative),
    policy: role.policy,
    languagePolicy: TAIWAN_LANGUAGE_POLICY,
  });
}

const RUNTIME = "host/crew.js";
const PATCH = "cordis.patch.yml";
const MOUNT_CHECK = "tools/verify-mount.mjs";
const REVIEWERS = ["roles/code-reviewer.md", "roles/security-reviewer.md", "roles/doc-reviewer.md"];
/**
 * The key the composed rules are read under.
 *
 * It is `roles/pm.md` on purpose: `rulesFile()` maps exactly this path to the
 * composed text, which is what "the PM's rules" means since V2. Every other entry
 * of `READ_FILES` is a real file with one home.
 */
const RULES = "roles/pm.md";
const READ_FILES = [RUNTIME, PATCH, MOUNT_CHECK, RULES, ...REVIEWERS];

/** The number a run of `Two`/`Three`/??words spells, for the pm.md wording pin. */
const WORDS = { 1: "one", 2: "two", 3: "three", 4: "four", 5: "five" };
const capitalise = (word) => `${word[0].toUpperCase()}${word.slice(1)}`;

/** Read every file the audit judges, keyed by its repository path. */
function readFiles(read) {
  const files = {};
  for (const rel of READ_FILES) files[rel] = read(rel);
  return files;
}

// --------------------------------------------------------------- the audit
//
// One pure function over the file texts and the prompt the PM really gets, so the
// same judgement can be run against a deliberately broken copy below.

const ID = {
  runtime: "host/crew.js gives `reviewRounds` the default of 2, not 3",
  prompt: "the mounted PM prompt carries that exact ceiling, once",
  patch: "the cordis.patch.yml example is the same number, and still a comment",
  patchCap: "the cordis.patch.yml example says that number is the only accepted value",
  mountCheck: "tools/verify-mount.mjs pins the same sentence the prompt carries",
  // V2: these two judge the RULES (the core plus every playbook), not the core
  // file ??the sentence lives in `roles/playbooks/crew-flow.md` now, and a case
  // that read `roles/pm.md` alone would call it missing. The key in `files` stays
  // `RULES` so the two are still read from one place.
  wording: "the PM rules state the same ceiling in words",
  stale: "the PM rules state no other whole-job ceiling",
  step10: "step 10 still stops the loop after round two and forbids a third round",
};
const reviewerId = (rel) => `${rel} keeps the same two-round rule`;

function audit(files, promptText) {
  const results = [];
  const add = (id, ok, detail = "") => results.push({ id, ok, detail });

  // --- the one place the number is decided --------------------------------
  const defaults = /const DEFAULT_LIMITS = \{[^}]*\}/.exec(files[RUNTIME])?.[0] ?? "";
  const rounds = Number(/reviewRounds:\s*(\d+)/.exec(defaults)?.[1]);
  add(
    ID.runtime,
    rounds === 2,
    `DEFAULT_LIMITS reads ${JSON.stringify(defaults)}; the whole rule is round one for the initial `
      + "review and round two for the one re-check, so the runtime default is 2",
  );

  // --- the PM prompt, which is built FROM that number ---------------------
  const stated = [...promptText.matchAll(/review rounds before you bring the disagreement to the user: (\d+)/g)]
    .map((match) => Number(match[1]));
  add(
    ID.prompt,
    stated.length === 1 && stated[0] === rounds,
    `the prompt states ${JSON.stringify(stated)}, the runtime default is ${rounds}. The prompt is built `
      + "from DEFAULT_LIMITS, so a difference here is the drift this case exists for: "
      + JSON.stringify(promptText.split("\n").filter((line) => line.startsWith("- review rounds")).join(" | ")),
  );

  // --- the documented example --------------------------------------------
  //
  // Only the line that really ASSIGNS the value is counted: the option's
  // documentation may name it in prose as well, and a check that counted every
  // mention would red a file that documents its own ceiling.
  const patchLines = files[PATCH].split("\n").filter((line) => /reviewRounds:\s*\d/.test(line));
  const patchRounds = Number(/reviewRounds:\s*(\d+)/.exec(files[PATCH])?.[1]);
  add(
    ID.patch,
    patchRounds === rounds && patchLines.length === 1 && patchLines[0].trim().startsWith("#"),
    `the example reads ${JSON.stringify(patchLines.join(" | "))} and the runtime default is ${rounds}. `
      + "It must agree, and it must stay a commented example rather than a live setting",
  );
  add(
    ID.patchCap,
    new RegExp(`reviewRounds:\\s*${rounds}\\b[^\\n]*(only accepted value|only value)`, "i").test(files[PATCH])
      && /leave it out/i.test(files[PATCH]),
    "the commented example does not say that this number is the only accepted value and that leaving the "
      + "setting out gives the same one, so a user reading the config file cannot tell that anything else is "
      + "refused at startup",
  );

  // --- the project check that pins the prompt's sentence ------------------
  const pinned = `review rounds before you bring the disagreement to the user: ${rounds}`;
  add(
    ID.mountCheck,
    flat(files[MOUNT_CHECK]).includes(pinned),
    `tools/verify-mount.mjs does not look for ${JSON.stringify(pinned)}, so it would pin a sentence the `
      + "prompt no longer carries",
  );

  // --- the written rule, in words ----------------------------------------
  //
  // Read from the composed rules, because that is where the sentence ships: it is
  // in `roles/playbooks/crew-flow.md`, which the PM reads on demand, and the
  // runtime number it has to agree with is the same number either way.
  const pmFlat = flat(files[RULES]);
  const word = WORDS[rounds];
  const sentence = word === undefined ? "" : `${capitalise(word)} rounds is the whole job's ceiling`;
  add(
    ID.wording,
    sentence !== "" && pmFlat.includes(sentence),
    `the PM rules do not carry ${JSON.stringify(sentence)}, so the written ceiling and the runtime `
      + `default (${rounds}) disagree`,
  );
  const others = Object.values(WORDS).filter((candidate) => candidate !== word)
    .map((candidate) => `${capitalise(candidate)} rounds is the whole job's ceiling`)
    .filter((text) => pmFlat.includes(text));
  add(
    ID.stale,
    others.length === 0,
    `the PM rules still state another ceiling for the whole job: ${JSON.stringify(others)} ??the PM `
      + "would be told two different numbers at once",
  );
  add(
    ID.step10,
    /One issue gets two rounds, and then it comes to you/i.test(pmFlat) && /Do not open a third round/i.test(pmFlat),
    "step 10 no longer says one issue gets two rounds and that no third round is opened, so the ceiling "
      + "has nothing behind it but a number",
  );

  // --- the three personas, which already carry the rule -------------------
  for (const rel of REVIEWERS) {
    const text = flat(files[rel]);
    add(
      reviewerId(rel),
      /One issue gets two review rounds/i.test(text) && /Open no third round/i.test(text),
      `${rel} no longer stops the same issue after two rounds and forbids a third one`,
    );
  }

  return results;
}

// ------------------------------------------------------------- the real run

const files = readFiles(rulesFile);
const crew = await mountCrew();
let results;
try {
  results = audit(files, crew.prompt);
} finally {
  crew.cleanUp();
}

console.log(`      the runtime ceiling is read from host/crew.js, and the prompt says it `
  + `${results.find((r) => r.id === ID.prompt)?.ok ? "the same way" : "differently"}`);
for (const result of results) check(result.id, result.ok, result.detail);

// -------------------------------------------------------------- mutations
//
// Each breakage gets its own throwaway copy of the repository, and the SAME audit
// function judges it. Without these the case is a green light with no bulb in it.

/** Break one file of a fresh copy, then run the audit over that copy. */
async function afterBreaking(breakIt) {
  const dir = tempRepo();
  try {
    breakIt(dir);
    const broken = {};
    // The rules entry is composed FROM THE COPY. Reading the copy's `roles/pm.md`
    // alone would judge the core while a mutation sat in a playbook ??a green that
    // proves nothing, which is the one failure a mutation case cannot afford. The
    // reviewer entries compose from the copy for the same reason since V2: their
    // two-round rule is shared text in `host/child-policy.js`.
    for (const rel of READ_FILES) {
      broken[rel] = rel === RULES
        ? composePmRulesIn(dir)
        : REVIEWERS.includes(rel)
          ? await personaIn(dir, rel)
          : copyFile(dir, rel);
    }
    return audit(broken, crew.prompt).filter((result) => !result.ok).map((result) => result.id);
  } finally {
    cleanUp(dir);
  }
}

// Mutation 1: the runtime default goes back to 3. The prompt is still the one the
// real mount produced, so this is exactly the drift ??a runtime number the prompt
// no longer agrees with.
const drifted = await afterBreaking((dir) => {
  edit(dir, RUNTIME, "liveAgents: 20, reviewRounds: 2", "liveAgents: 20, reviewRounds: 3");
});
check(
  "mutation 1: a runtime default of 3 turns the prompt check red",
  drifted.includes(ID.prompt) && drifted.includes(ID.patch) && drifted.includes(ID.mountCheck),
  `failed checks were ${JSON.stringify(drifted)} ??a runtime default that disagrees with the prompt, `
    + "the documented example and the project check did not turn this case red",
);

// Mutation 2: the rules state the old ceiling in words while the runtime says 2.
// The sentence moved into `roles/playbooks/crew-flow.md` in V2, so the anchor
// points there; the read-back composes the copy, so the edit is really judged.
const restated = await afterBreaking((dir) => {
  edit(dir, "roles/playbooks/crew-flow.md", "Two rounds is the whole job's ceiling too", "Three rounds is the whole job's ceiling");
});
check(
  "mutation 2: the rules stating three rounds turns the wording check red",
  restated.includes(ID.wording) && restated.includes(ID.stale),
  `failed checks were ${JSON.stringify(restated)}`,
);

// Mutation 3: the shared two-round rule loses its teeth. The sentence lives in
// `host/child-policy.js` since V2 ??all three reviewers read it from there ??so the
// mutation is aimed at the shared text and read back through the composed persona.
const persona = await afterBreaking((dir) => {
  edit(dir, "host/child-policy.js", "One issue gets two review rounds.", "One issue gets as many rounds as it needs.");
});
check(
  `mutation 3: ${REVIEWERS[0]} dropping the two-round rule turns its own check red`,
  persona.includes(reviewerId(REVIEWERS[0])),
  `failed checks were ${JSON.stringify(persona)}`,
);

done();
