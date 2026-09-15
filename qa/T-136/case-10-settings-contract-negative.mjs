// T-136 DoD item 4: the settings.section id/order, dsh-crew-roles namespace, and absent settings.plugin.item contract are mutation-tested by both verifiers.

import {
  cleanUp,
  done,
  edit,
  expectGreen,
  expectRed,
  failLines,
  runCheck,
  tempRepo,
} from "../lib/qa.mjs";

const CLIENT = "client/crew-settings.js";
const CHECKS = [
  {
    script: "tools/verify-client-boot-graph.mjs",
    label: "client boot-graph verification",
  },
  {
    script: "tools/verify-role-settings.mjs",
    label: "role-settings verification",
  },
];

function printRun(label, script, run) {
  console.log(`${label} :: node ${script} :: exit ${run.status}`);
  for (const line of failLines(run)) console.log(`  ${line}`);
}

function runBaseline() {
  const dir = tempRepo();
  try {
    for (const { script, label } of CHECKS) {
      const run = runCheck(dir, script);
      printRun("baseline", script, run);
      expectGreen(run, `baseline ${label} is green`);
    }
  } finally {
    cleanUp(dir);
  }
}

function runMutation({ label, from, to, needles }) {
  const dir = tempRepo();
  try {
    edit(dir, CLIENT, from, to);
    for (const { script, label: checkLabel } of CHECKS) {
      const run = runCheck(dir, script);
      printRun(label, script, run);
      expectRed(run, needles[script], `${label}: ${checkLabel} rejects the changed contract`);
    }
  } finally {
    cleanUp(dir);
  }
}

runBaseline();

runMutation({
  label: "settings.section id mutation",
  from: 'id: "crew"',
  to: 'id: "crew-broken"',
  needles: {
    "tools/verify-client-boot-graph.mjs": 'settings.section id "crew"',
    "tools/verify-role-settings.mjs": "Crew settings section id is crew",
  },
});

runMutation({
  label: "settings.section order mutation",
  from: "order: 30",
  to: "order: 31",
  needles: {
    "tools/verify-client-boot-graph.mjs": "settings.section order 30",
    "tools/verify-role-settings.mjs": "Crew settings section follows",
  },
});

runMutation({
  label: "dsh-crew-roles namespace mutation",
  from: 'const SETTINGS_NAMESPACE = "dsh-crew-roles";',
  to: 'const SETTINGS_NAMESPACE = "dsh-crew-roles-broken";',
  needles: {
    "tools/verify-client-boot-graph.mjs": "dsh-crew-roles namespace",
    "tools/verify-role-settings.mjs": "namespace contract",
  },
});

runMutation({
  label: "settings.plugin.item re-addition",
  from: 'ctx.slots.inject("settings.section", () => ctx.slots.register({',
  to: 'ctx.slots.inject("settings.plugin.item", () => {});\n      ctx.slots.inject("settings.section", () => ctx.slots.register({',
  needles: {
    "tools/verify-client-boot-graph.mjs": "does not register settings.plugin.item",
    "tools/verify-role-settings.mjs": "no longer registers settings.plugin.item",
  },
});

done();


