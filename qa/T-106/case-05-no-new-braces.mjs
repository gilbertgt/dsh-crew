// T-106 DoD item 5: `roles/pm.md` contains no `{{`.
//
// What it proves: design rule 5 of `CLAUDE.md` still holds for the file this task
// rewrote. dsh interpolates `{{name}}` in prompt text and an unknown variable
// fails the WHOLE prompt assembly, so a stray `{{` in a role file is not a typo,
// it is that role unable to start. The new wording quotes the user ("leave it
// undecided") and quotes section names, which is exactly the kind of edit that
// reaches for a brace.
//
// WHY THIS CASE CARRIES A REVERSE PROOF. An assertion that a string appears ZERO
// times is the one shape that passes when the check never read anything — an
// empty file, a wrong path, a helper that returned "". That is shape 4 of
// `ADR 0023`. So before the zero is believed, the same read is made to produce a
// number that CANNOT be zero.
//
// PINNING STYLE: RAW BYTES. `{{` cannot wrap, and flattening could join a `{` at
// the end of one line to a `{` at the start of the next — inventing a hit that is
// not in the file.

import { check, done, pmRules, repoFile } from "../lib/qa.mjs";

const prompt = pmRules();
const braces = (prompt.match(/\{\{/g) ?? []).length;

// ------------------------------------------------------------ reverse proof
const words = (prompt.match(/\bthe\b/g) ?? []).length;
console.log(`roles/pm.md: ${prompt.length} characters, ${words} occurrence(s) of "the", ${braces} of "{{"`);

check(
  "this case really read roles/pm.md",
  prompt.length > 50_000 && words > 500,
  `${prompt.length} characters and ${words} "the" — the file was not read, so the zero below would mean nothing`,
);

check(
  "roles/pm.md contains no `{{`",
  braces === 0,
  `${braces} occurrence(s): ${[...prompt.matchAll(/\{\{/g)].map((hit) => JSON.stringify(prompt.slice(Math.max(0, hit.index - 40), hit.index + 40))).join("\n      ")}`
    + "\n      dsh fails the whole prompt assembly on an unknown variable, so this is the PM unable to start",
);

// The same rule, for the paragraphs this task added. A file-wide zero already
// covers it; this names the added text in the failure message so the next reader
// knows where to look.
const added = ["leave it undecided", "not in scope", "still undecided"];
for (const phrase of added) {
  const at = prompt.indexOf(phrase);
  if (at === -1) continue;
  const around = prompt.slice(Math.max(0, at - 200), at + 200);
  check(
    `the wording around "${phrase}" uses no template braces`,
    !around.includes("{{"),
    `the 400 characters around it hold a template brace: ${JSON.stringify(around)}`,
  );
}

done();
