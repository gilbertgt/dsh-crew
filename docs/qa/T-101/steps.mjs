// Not a QA case — a small reader for one GitHub Actions workflow file, used by
// the `case-*.mjs` files beside it. The runners only execute `case-*.mjs`, so
// nothing ever runs this file on its own.
//
// It is deliberately a SECOND reader of the same file, written here instead of
// imported from tools/verify-mount.mjs. The cases in this folder judge the
// delivered `.github/workflows/publish.yml` against what section seven of
// `docs/design/prd-2026-08-22-gh-release.md` promised. A case that borrowed the
// pin's own reader would agree with the pin by construction, and could then only
// ever report that the pin agrees with itself. The pin is judged separately, by
// the cases under docs/qa/T-100/ and docs/qa/T-102/, which break the file and
// require the pin to notice.
//
// It is also deliberately not a YAML parser: this repository has no
// dependencies, and every workflow pin it already carries reads text. What is
// read here is text too, but line-anchored the same way, so a step name quoted
// inside somebody's comment satisfies nothing.

/** Every line whose first non-space character is `#`, removed. */
export const codeOnly = (text) => text.split("\n").filter((line) => !/^[ \t]*#/.test(line)).join("\n");

/** A YAML scalar as written on one line: trailing `# comment` off, quotes off. */
export const scalar = (raw) => raw.replace(/[ \t]#.*$/, "").trim().replace(/^["']|["']$/g, "");

/**
 * The steps of the single job in a workflow file, top to bottom.
 *
 * A step opens with a `- ` at the indent of the first list item under `steps:`;
 * a deeper `- ` belongs to a step's body (a list value, or a line of shell
 * inside a `run: |` block) and a shallower non-blank line has left the job.
 *
 * Each step carries:
 *   `label` — its `name:` when it has one, otherwise its `uses:`
 *   `kind`  — "name" or "uses", so a case can say which of the two it matched
 *   `code`  — the step's lines with whole-line comments removed
 *   `line`  — the 0-based line the step opens on, for order comparisons
 *
 * @throws when the file has no `steps:` key, so a case dies loudly on a file
 *         whose shape moved instead of quietly passing on an empty list.
 */
export function publishSteps(text) {
  const lines = text.split("\n");
  const stepsAt = lines.findIndex((line) => /^([ \t]+)steps:[ \t]*$/.test(line));
  if (stepsAt === -1) throw new Error("no `steps:` key found in the workflow — the file's shape moved");
  const stepsIndent = /^([ \t]*)/.exec(lines[stepsAt])[1].length;

  let itemIndent = null;
  const starts = [];
  let end = lines.length;
  for (let index = stepsAt + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.trim().length === 0) continue;
    if (line.search(/\S/) <= stepsIndent) { end = index; break; }  // back out of `steps:`
    const opener = /^([ \t]*)-[ \t]+\S/.exec(line);
    if (!opener) continue;
    if (itemIndent === null) itemIndent = opener[1].length;
    if (opener[1].length === itemIndent) starts.push(index);
  }
  if (starts.length === 0) throw new Error("`steps:` holds no list items — the file's shape moved");

  return starts.map((start, position) => {
    const stop = position + 1 < starts.length ? starts[position + 1] : end;
    const block = lines.slice(start, stop).join("\n");
    const code = codeOnly(block);
    const named = /^[ \t]*(?:-[ \t]+)?name:[ \t]*(.*)$/m.exec(code);
    const uses = /^[ \t]*(?:-[ \t]+)?uses:[ \t]*(.*)$/m.exec(code);
    return {
      label: named ? scalar(named[1]) : uses ? scalar(uses[1]) : "",
      kind: named ? "name" : "uses",
      block,
      code,
      line: start,
    };
  });
}

/** One step by its exact `name:`, or `undefined`. */
export const stepNamed = (steps, name) => steps.find((step) => step.kind === "name" && step.label === name);

/**
 * The value of a top-level key of one step, exactly as written, with a trailing
 * `# comment` off and nothing else touched. Used for `if:`, whose value carries
 * quotes of its own (`… == 'true'`) that must survive.
 */
export function keyRaw(step, key) {
  const match = new RegExp(`^[ \\t]*(?:-[ \\t]+)?${key}:[ \\t]*(.*)$`, "m").exec(step.code);
  return match ? match[1].replace(/[ \t]#.*$/, "").trim() : null;
}

/** The same value as a YAML scalar: quotes around the whole of it come off too. */
export function keyIn(step, key) {
  const raw = keyRaw(step, key);
  return raw === null ? null : raw.replace(/^["']|["']$/g, "");
}

/**
 * The shell a step runs: the body of its `run:`, comments and all, flattened to
 * single spaces so a check does not depend on where a backslash wraps a line.
 * Returns "" for a step that runs nothing.
 */
export function shellOf(step) {
  const lines = step.block.split("\n");
  const at = lines.findIndex((line) => /^[ \t]*(?:-[ \t]+)?run:/.test(line));
  if (at === -1) return "";
  const first = /^[ \t]*(?:-[ \t]+)?run:[ \t]*(.*)$/.exec(lines[at])[1];
  if (first.trim() && first.trim() !== "|" && first.trim() !== ">") return first.trim();
  const indent = lines[at].search(/\S/);
  const body = [];
  for (const line of lines.slice(at + 1)) {
    if (line.trim().length === 0) { body.push(""); continue; }
    if (line.search(/\S/) <= indent) break;
    body.push(line);
  }
  return body.join("\n");
}

/** The one step that runs `npm publish`. @throws when there is not exactly one */
export function publishStepOf(steps) {
  const found = steps.filter((step) => /(^|\n)[ \t]*(?:-[ \t]+)?run:[ \t]*.*npm publish\b/.test(step.code) || /npm publish\b/.test(codeOnly(shellOf(step))));
  if (found.length !== 1) throw new Error(`expected exactly one step running \`npm publish\`, found ${found.length}`);
  return found[0];
}
