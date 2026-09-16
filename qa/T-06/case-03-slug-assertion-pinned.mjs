// Task T-06 — acceptance check 46 (CRD 0002).
// The slug rule is pinned by tools/verify-mount.mjs: removing the pattern from
// the PM rules has to turn the check red and name the file. Done in a copy of the
// repository; the repository itself is never changed.
//
// Crew V2: the pin reads the composed rules — the always-loaded core
// `roles/pm.md` plus the playbooks under `roles/playbooks/` (see
// `host/playbooks.js`) — so taking the pattern out of one file no longer takes it
// out of what the pin sees. This case edits every file that carries it, exactly
// the way the pin reads them, and restores them afterwards.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tempRepo, runCheck, cleanUp, check, done } from "../lib/qa.mjs";
import { PLAYBOOKS } from "../../host/playbooks.js";

const PATTERN = "^[a-z0-9]([a-z0-9-]*[a-z0-9])?$";

/** Every file the composed PM rules are read from, core first. */
const ruleFiles = (dir) => [
  join(dir, "roles", "pm.md"),
  ...PLAYBOOKS.map((playbook) => join(dir, "roles", "playbooks", playbook.file)),
];

const dir = tempRepo();
try {
  const originals = ruleFiles(dir).map((file) => [file, readFileSync(file, "utf8")]);
  const carrying = originals.filter(([, text]) => text.includes(PATTERN));

  const base = runCheck(dir, "tools/verify-mount.mjs");
  check("the untouched copy passes verify-mount", base.status === 0, base.out.slice(-600));
  check(
    "the slug pattern is in the PM rules",
    carrying.length > 0,
    `no rule file carries ${PATTERN}: ${originals.map(([file]) => file.replace(dir, "")).join(", ")}`,
  );

  for (const [file, text] of carrying) writeFileSync(file, text.split(PATTERN).join("<removed by QA>"));
  const broken = runCheck(dir, "tools/verify-mount.mjs");
  for (const [file, text] of originals) writeFileSync(file, text);

  check("removing the slug pattern turns verify-mount red", broken.status !== 0, broken.out.slice(-600));
  check("the failure names roles/pm.md", /FAIL[\s\S]*roles\/pm\.md/.test(broken.out), broken.out.slice(-600));
  check("the failure names the pattern itself",
    broken.out.includes(PATTERN), broken.out.slice(-600));
} finally {
  cleanUp(dir);
}

done();
