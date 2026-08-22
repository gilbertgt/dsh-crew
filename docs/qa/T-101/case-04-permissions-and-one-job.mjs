// T-101 DoD items 2 and 3 (M1 DoD item 2): the publishing job is granted
// `contents: write` and `id-token: write`, and the file still holds exactly one
// job.
//
// `contents: read` is the whole defect this reads for. The file parses, every
// other check stays green, and the mistake shows only when a v* tag is pushed:
// the package reaches npm, `gh release create` is refused, the run goes red —
// and by the interview's answer 3 re-pushing the tag cannot repair it, because
// the second run finds the version already on npm and skips the release step
// with the publish.
//
// `id-token: write` is read in the same breath. This repository stores no npm
// secret; that grant is what mints the OIDC credential trusted publishing
// authenticates with, so losing it does not weaken the publish, it stops it.
//
// The one-job shape matters here for a reason of its own: `permissions:` is a
// key of a job, so "the grant the release run gets" is only a well-defined thing
// while there is one job to ask about.

import { check, done, repoFile } from "../lib/qa.mjs";
import { codeOnly } from "./steps.mjs";

const PUBLISH_YML = ".github/workflows/publish.yml";
const text = repoFile(PUBLISH_YML);
const code = codeOnly(text);

// ---- exactly one job
const jobsAt = code.search(/^jobs:[ \t]*$/m);
check(`${PUBLISH_YML}: it has a top-level \`jobs:\` key`, jobsAt !== -1, code.slice(0, 200));

const jobsRegion = jobsAt === -1 ? "" : code.slice(jobsAt);
// A job is a key at the first indent under `jobs:`. Anything deeper belongs to
// one of them.
const jobLines = jobsRegion.split("\n").slice(1).filter((line) => /^[ \t]{1,4}[A-Za-z_][\w-]*:[ \t]*$/.test(line) && line.search(/\S/) === 2);
check(
  `${PUBLISH_YML}: it still has exactly one job (${jobLines.map((line) => line.trim()).join(", ") || "none"})`,
  jobLines.length === 1,
  jobLines.join("\n"),
);

// ---- the two grants
// The job's own `permissions:` block: the key, plus every following line
// indented deeper than it.
const key = /^([ \t]*)permissions[ \t]*:[ \t]*([^\n]*)$/m.exec(code);
check(`${PUBLISH_YML}: the job says \`permissions:\` in the file`, Boolean(key), "no permissions block at all");

let granted = "";
if (key) {
  const indent = key[1].length;
  const body = [key[2]];
  for (const line of code.slice(key.index + key[0].length).split("\n").slice(1)) {
    if (line.trim().length === 0) continue;
    if (line.search(/\S/) <= indent) break;
    body.push(line);
  }
  granted = body.join("\n");
}

for (const [scope, why] of [
  ["contents", "`gh release create` writes the release page through it"],
  ["id-token", "trusted publishing mints its OIDC token from it, and no npm secret is stored here"],
]) {
  const value = new RegExp(`(?:^|[{,])[ \\t]*['"]?${scope}['"]?[ \\t]*:[ \\t]*['"]?([A-Za-z-]+)['"]?`, "m").exec(granted)?.[1] ?? null;
  check(
    `${PUBLISH_YML}: the job is granted \`${scope}: write\` — ${why}`,
    value === "write",
    `granted ${JSON.stringify(value)}\n      permissions block:\n${granted}`,
  );
}

done();
