// T-137 DoD item 7 — `reviewRounds` is not a range: 2 is the only value it takes.
//
// The whole design is two rounds. Round one is the initial review, round two is
// the one re-check after the fix, and the PM prompt and all three reviewer
// personas are written around exactly that. So a profile can break the product in
// two directions, and this case has to see both:
//
//   * a value above 2 promises the PM a round every reviewer persona refuses to
//     run, which is the contradiction the two-round rule was written to end;
//   * a value of 1 drops the re-check the rule exists for, so the engineer's fix
//     reaches the user with exactly the review the loop was built to give a
//     second look.
//
// The setting therefore takes `2`, or nothing at all (the same 2), and everything
// else — 0, 1, 3, 99, a fraction, even the string "2" — is refused when the plugin
// mounts.
//
// Every check drives the REAL `host/crew.js` through `mountCrew`, with a throwaway
// DSH home: nothing here is asserted from a copy of the source. The accepted half
// proves the refusal is not simply refusing everything, and a large `liveAgents`
// beside it proves that only this one limit is pinned.

import { check, done, mountCrew } from "../lib/qa.mjs";

const REVIEW_ROUNDS = 2;

/** Mount one set of limits and hand back the record, cleaned up afterwards. */
async function mount(limits) {
  const crew = await mountCrew({ plugin: { limits } });
  try {
    return { thrown: crew.thrown, prompt: crew.prompt };
  } finally {
    crew.cleanUp();
  }
}

// ---------------------------------------------------------------- refusals

const refused = [
  [{ reviewRounds: 0 }, "zero — no round at all"],
  [{ reviewRounds: 1 }, "one round — it drops the re-check the rule exists for"],
  [{ reviewRounds: 3 }, "three — a round no reviewer persona will run"],
  [{ reviewRounds: 4 }, "four — well past the rule"],
  [{ reviewRounds: 99 }, "ninety-nine — far past it"],
  [{ reviewRounds: 2.5 }, "a fraction above it"],
  [{ reviewRounds: "2" }, "a string that looks right but is not the number"],
];

for (const [limits, what] of refused) {
  const { thrown } = await mount(limits);
  const message = thrown?.message ?? "";
  check(
    `limits ${JSON.stringify(limits)} is refused at mount (${what})`,
    thrown !== undefined,
    "it mounted quietly, so a profile can still set a number the review loop was not built for",
  );
  check(
    "the refusal names limits.reviewRounds",
    message.includes("limits.reviewRounds"),
    message,
  );
  check(
    `the refusal names the one accepted value (${REVIEW_ROUNDS})`,
    new RegExp(`must be ${REVIEW_ROUNDS}\\b`).test(message),
    `${JSON.stringify(message)} — a user who wrote the value has to be told what the only legal one is`,
  );
  check(
    "the refusal says that leaving it out is allowed, so the user is not stuck",
    /unset|leave it out/i.test(message),
    message,
  );
}

// ---------------------------------------------------------------- acceptances

// The one accepted value, with a large liveAgents beside it: only one of the two
// limits is pinned, and a case that reds on both would be refusing too much.
const atTwo = await mount({ liveAgents: 99, reviewRounds: REVIEW_ROUNDS });
check(
  `the one accepted value (${REVIEW_ROUNDS}) mounts, next to an unbounded liveAgents`,
  atTwo.thrown === undefined,
  atTwo.thrown?.message ?? "",
);

// A profile that writes no value at all gets the same one, so the refusal above
// cannot be read as "the setting was removed".
const unset = await mount({ liveAgents: 1 });
check(
  `a profile that writes no reviewRounds at all still gets ${REVIEW_ROUNDS}`,
  unset.thrown === undefined
    && unset.prompt.includes(`review rounds before you bring the disagreement to the user: ${REVIEW_ROUNDS}`),
  unset.thrown?.message
    ?? unset.prompt.split("\n").filter((line) => line.startsWith("- review rounds")).join(" | "),
);

// Both accepted shapes reach the prompt with the same sentence, and that sentence
// says the number is fixed rather than a preference the PM may argue about: the
// three reviewer personas are written to stop at exactly that number.
for (const [label, session] of [["2", atTwo], ["unset", unset]]) {
  check(
    `the prompt for reviewRounds: ${label} states ${REVIEW_ROUNDS} as fixed, not as a preference`,
    /review rounds before you bring the disagreement to the user: 2 — fixed, not a preference/i.test(session.prompt),
    session.prompt.split("\n").filter((line) => line.startsWith("- review rounds")).join(" | ")
      || "the prompt carries no review-rounds line at all",
  );
}

done();
