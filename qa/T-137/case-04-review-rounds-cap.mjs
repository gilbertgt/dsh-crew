// T-137 DoD item 7 — `reviewRounds` is a ceiling, not a suggestion.
//
// The runtime default and the three reviewer prompts already agree on two rounds
// (`qa/T-137/case-01-review-rounds-two-everywhere.mjs` ties those two together).
// What was still open is the other direction: a profile could write
// `limits.reviewRounds: 5` and the runtime would obey it — promising the PM a
// loop that every reviewer persona is forbidden to run, which is exactly the
// contradiction the two-round rule exists to end. So the mount now refuses any
// value above the ceiling instead of accepting it.
//
// Every check here drives the REAL `host/crew.js` through `mountCrew`, with a
// throwaway DSH home: nothing is asserted from a copy of the source. The four
// refusals are the shapes a profile can actually write — one above the ceiling,
// well above it, and a fraction — and the accepted side proves the check is not
// simply refusing everything, including that a large `liveAgents` still mounts
// (only `reviewRounds` is bounded).

import { check, done, mountCrew } from "../lib/qa.mjs";

const CEILING = 2;

/** Mount one pair of limits and hand back the record, cleaned up afterwards. */
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
  [{ reviewRounds: 3 }, "one round past the ceiling"],
  [{ reviewRounds: 4 }, "two rounds past it"],
  [{ reviewRounds: 99 }, "far past it"],
  [{ reviewRounds: 2.5 }, "a fraction above it"],
];

for (const [limits, what] of refused) {
  const { thrown } = await mount(limits);
  const message = thrown?.message ?? "";
  check(
    `limits ${JSON.stringify(limits)} is refused at mount (${what})`,
    thrown !== undefined,
    "it mounted quietly, so a profile can still promise the PM a third round",
  );
  check(
    `the refusal names limits.reviewRounds`,
    message.includes("limits.reviewRounds"),
    message,
  );
  check(
    `the refusal states the maximum (${CEILING})`,
    new RegExp(`at most ${CEILING}\\b`).test(message),
    `${JSON.stringify(message)} — a user who wrote the value has to be told what the largest legal one is`,
  );
}

// ---------------------------------------------------------------- acceptances

// The ceiling itself, with a large liveAgents beside it: only one of the two
// limits is bounded, and a case that reds on both would be refusing too much.
const atCeiling = await mount({ liveAgents: 99, reviewRounds: CEILING });
check(
  `the ceiling itself (${CEILING}) is accepted, next to an unbounded liveAgents`,
  atCeiling.thrown === undefined,
  atCeiling.thrown?.message ?? "",
);
check(
  "that session's prompt carries the ceiling as a hard one",
  atCeiling.prompt.includes(`review rounds before you bring the disagreement to the user: ${CEILING}`)
    && /hard ceiling/i.test(atCeiling.prompt),
  atCeiling.prompt.split("\n").filter((line) => line.startsWith("- review rounds")).join(" | ")
    || "the prompt carries no review-rounds line at all",
);

// A profile that writes no value at all still gets the ceiling, so the refusal
// above cannot be read as "the default was removed".
const byDefault = await mount({ liveAgents: 1 });
check(
  `a profile that writes no reviewRounds still gets ${CEILING}`,
  byDefault.thrown === undefined
    && byDefault.prompt.includes(`review rounds before you bring the disagreement to the user: ${CEILING}`),
  byDefault.thrown?.message
    ?? byDefault.prompt.split("\n").filter((line) => line.startsWith("- review rounds")).join(" | "),
);

done();
