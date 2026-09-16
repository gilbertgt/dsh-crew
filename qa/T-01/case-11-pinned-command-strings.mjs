// Task T-01 — acceptance checks 2, 17 and 27.
// Proves each pinned command string of the merge step is really in the PM rules
// AND that removing it on its own turns `node tools/verify-mount.mjs` red with
// roles/pm.md named in the output. The repository is copied to a temporary
// folder first; the repository's own files are never changed.
//
// Crew V2: the pin reads the composed rules — the always-loaded core
// `roles/pm.md` plus the playbooks under `roles/playbooks/` (`host/playbooks.js`
// is the manifest) — so removing a string from one file no longer removes it
// from what the pin sees, and a case that edited the core alone went green on a
// copy whose playbook still carried the command. Every file that carries the
// string is edited here, exactly the way the pin reads them.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tempRepo, runCheck, cleanUp, check, done } from "../lib/qa.mjs";
import { PLAYBOOKS } from "../../host/playbooks.js";

// The four commands of decision H plus the three strings of W. The eighth
// pinned string is the job-slug pattern and belongs to T-06.
const PINNED = [
  "git merge --no-ff",
  "git branch -d crew/",
  "git push origin --delete",
  "git branch --merged main",
  "--ff-only",
  "origin/crew/",
  "publishCheck",
];

/** Every file the composed PM rules are read from, core first. */
const ruleFiles = (dir) => [
  join(dir, "roles", "pm.md"),
  ...PLAYBOOKS.map((playbook) => join(dir, "roles", "playbooks", playbook.file)),
];

const dir = tempRepo();
try {
  const originals = ruleFiles(dir).map((file) => [file, readFileSync(file, "utf8")]);

  const base = runCheck(dir, "tools/verify-mount.mjs");
  check("the untouched copy passes verify-mount", base.status === 0, base.out.slice(-600));

  for (const pinned of PINNED) {
    const carrying = originals.filter(([, text]) => text.includes(pinned));
    check(
      `the PM rules contain ${pinned}`,
      carrying.length > 0,
      `no rule file carries ${pinned}: ${originals.map(([file]) => file.replace(dir, "")).join(", ")}`,
    );
    for (const [file, text] of carrying) writeFileSync(file, text.split(pinned).join("<removed by QA>"));
    const broken = runCheck(dir, "tools/verify-mount.mjs");
    for (const [file, text] of originals) writeFileSync(file, text);
    check(`removing ${pinned} turns verify-mount red`, broken.status !== 0, broken.out.slice(-600));
    check(`the failure for ${pinned} names roles/pm.md`,
      /FAIL[\s\S]*roles\/pm\.md/.test(broken.out), broken.out.slice(-600));
  }
} finally {
  cleanUp(dir);
}

done();
