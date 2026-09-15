// T-136 DoD item 4: the browser settings contract keeps settings.section, id "crew", order 30, the dsh-crew-roles namespace, and no settings.plugin.item registration.
//
// This case runs both verification commands against an isolated temporary copy,
// checks the contract-specific green lines rather than only their exit status,
// then mutates that copy's settings.section injection and proves both checks go
// red with a named contract failure. The repository itself is never changed.

import { check, done, tempRepo, runCheck, cleanUp, edit, expectGreen, expectRed, failLines, saidOk } from "../lib/qa.mjs";

const BOOT_GRAPH = "tools/verify-client-boot-graph.mjs";
const ROLE_SETTINGS = "tools/verify-role-settings.mjs";
const CLIENT = "client/crew-settings.js";

const bootContractChecks = [
  "the client runtime injects settings.section",
  "the mounted settings section id is crew",
  "the mounted settings section order is 30",
  "the client runtime binds the dsh-crew-roles namespace",
  "the client runtime does not inject settings.plugin.item",
];

const roleSettingsContractChecks = [
  "the client keeps the settings namespace contract",
  "the Crew client registers through settings.section",
  "the Crew settings section id is crew",
  "the Crew settings section follows the built-in settings sections",
  "the Crew client no longer registers settings.plugin.item",
];

const dir = tempRepo();
try {
  const boot = runCheck(dir, BOOT_GRAPH);
  expectGreen(boot, "node tools/verify-client-boot-graph.mjs is green for the settings contract");
  for (const message of bootContractChecks) {
    check(`boot-graph output proves: ${message}`, saidOk(boot, message), boot.out);
  }
  console.log(`node ${BOOT_GRAPH}: exit ${boot.status}; ${bootContractChecks.length} settings-contract checks matched`);

  const roleSettings = runCheck(dir, ROLE_SETTINGS);
  expectGreen(roleSettings, "node tools/verify-role-settings.mjs is green for the settings contract");
  for (const message of roleSettingsContractChecks) {
    check(`role-settings output proves: ${message}`, saidOk(roleSettings, message), roleSettings.out);
  }
  console.log(`node ${ROLE_SETTINGS}: exit ${roleSettings.status}; ${roleSettingsContractChecks.length} settings-contract checks matched`);

  // Deliberately break only the temporary copy. Both real verifiers must name
  // the broken settings.section contract instead of merely returning non-zero.
  edit(dir, CLIENT, 'ctx.slots.inject("settings.section"', 'ctx.slots.inject("settings.plugin.item"');

  const brokenBoot = runCheck(dir, BOOT_GRAPH);
  expectRed(
    brokenBoot,
    "the client runtime injects settings.section",
    "changing settings.section to settings.plugin.item makes the boot-graph verifier fail",
  );
  console.log(`negative ${BOOT_GRAPH}: exit ${brokenBoot.status}`);
  console.log(failLines(brokenBoot).join("\n"));

  const brokenRoleSettings = runCheck(dir, ROLE_SETTINGS);
  expectRed(
    brokenRoleSettings,
    "the Crew client registers through settings.section",
    "changing settings.section to settings.plugin.item makes the role-settings verifier fail",
  );
  console.log(`negative ${ROLE_SETTINGS}: exit ${brokenRoleSettings.status}`);
  console.log(failLines(brokenRoleSettings).join("\n"));
} finally {
  cleanUp(dir);
}

done();