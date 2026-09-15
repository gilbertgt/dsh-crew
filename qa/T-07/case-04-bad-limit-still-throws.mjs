// Task T-07 — acceptance check 51 (CRD 0003).
// Removing one setting may not soften the check on the others: a value written
// wrong still has to stop the mount. These values are QA's own — the project's
// own check covers liveAgents: 0.
//
// The two limits do not share a contract, so each value carries the message it has
// to produce: `liveAgents` is a range that starts at 1, while `reviewRounds` is
// the one number the review loop is built on and takes nothing else.
// `qa/T-137/case-04-review-rounds-cap.mjs` drives the second one in full,
// including `1` and `3`.
import { mountCrew, check, done } from "../lib/qa.mjs";

const bad = [
  [{ liveAgents: -1 }, "liveAgents", /whole number of 1 or more/],
  [{ liveAgents: "abc" }, "liveAgents", /whole number of 1 or more/],
  [{ liveAgents: 2.5 }, "liveAgents", /whole number of 1 or more/],
  [{ reviewRounds: 0 }, "reviewRounds", /must be 2\b/],
  [{ reviewRounds: null }, "reviewRounds", /must be 2\b/],
];

for (const [limits, field, wording] of bad) {
  const crew = await mountCrew({ plugin: { limits } });
  try {
    check(`limits ${JSON.stringify(limits)} is refused at mount`, crew.thrown !== undefined, "it mounted quietly");
    check(`the error names limits.${field}`,
      (crew.thrown?.message ?? "").includes(`limits.${field}`), crew.thrown?.message ?? "");
    check(`the error says what a good value looks like (${wording.source})`,
      wording.test(crew.thrown?.message ?? ""), crew.thrown?.message ?? "");
  } finally {
    crew.cleanUp();
  }
}

// And a good value still mounts, so the check is not simply refusing everything.
// `reviewRounds` takes exactly 2, so the accepted pair names that value;
// `qa/T-137/case-04-review-rounds-cap.mjs` is what proves 1 and 3 are refused.
const good = await mountCrew({ plugin: { limits: { liveAgents: 1, reviewRounds: 2 } } });
try {
  check("a valid pair of limits still mounts", good.thrown === undefined, good.thrown?.message ?? "");
} finally {
  good.cleanUp();
}

done();
