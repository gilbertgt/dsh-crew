// dsh-crew's playbook loader (AGENT plane): the `crew_playbook` tool.
//
// Crew V2 moved the PM's flows out of the always-loaded prompt into the
// playbooks under `roles/playbooks/`, to be read when the job needs one. The PM
// was told to read them with its own `read` tool and a workspace-relative path —
// `read roles/playbooks/crew-flow.md`.
//
// **That path is wrong the moment dsh-crew is not the working directory.** It is
// a package: `dsh plugin add dsh-crew` installs it under the profile's
// `node_modules`, a global install puts it under npm's prefix, and the preset is
// copied into `$DSH_HOME/.agent-presets/crew`. In every one of those, the PM's
// `read` resolves the path against the USER'S workspace, where no `roles/`
// directory exists — so the one file the route depends on is unreachable, and
// the failure looks like "the playbook is missing" rather than "you were given a
// path that only works in a checkout".
//
// So the playbooks are served by a tool that resolves them INSIDE the package.
// `readPlaybook()` is rooted at `import.meta.url`, so the answer does not depend
// on the session's working directory, on how dsh-crew was installed, or on the
// PM knowing where it lives. The PM asks for a playbook by its NAME, and the name
// has to be one the manifest carries.

import { defineTool } from "@deepseek-ai/dsh-tools";

import { PLAYBOOK_NAMES, PLAYBOOKS, readPlaybookByName } from "./playbooks.js";

export const name = "dsh-crew-playbook";

/** Registers into the agent's model-facing tool registry. */
export const inject = ["tools"];

/** `crew-flow` — the flow — read it when the route is `crew` … */
const WHEN = PLAYBOOKS.map((playbook) => `${playbook.file.replace(/\.md$/, "")} (${playbook.when})`).join("; ");

export function apply(ctx) {
  ctx.tools.register(defineTool({
    name: "crew_playbook",
    description: `Read one of the crew's flow playbooks, which ship inside the dsh-crew package. Use this instead of reading a roles/playbooks path from your workspace: the files are not in the user's project. Read the playbook the job needs, when it needs it, and nothing else; when a playbook and your prompt disagree, your prompt wins. Available: ${WHEN}.`,
    parameters: {
      name: {
        type: "string",
        required: true,
        enum: PLAYBOOK_NAMES,
        description: "The playbook to read, by name.",
      },
    },
    output: {
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string", required: true },
          text: { type: "string", required: true },
        },
      },
      render: (_args, value) => [{ type: "text", text: value.text }],
    },
    async execute(args) {
      return { name: args.name, text: readPlaybookByName(args.name) };
    },
  }));
}
