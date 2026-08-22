// Not a QA case — the step surgery the `case-*.mjs` files beside it use. The
// runners only execute `case-*.mjs`, so nothing runs this file on its own.
//
// Three of T-100's mutations cannot be written as a string swap: deleting a
// step, and moving one to the other side of the publish. The step they act on
// carries a forty-line shell script and a comment block, so an `edit()` anchor
// covering the whole of it would be a copy of the file inside a case — and it
// would break, with a confusing "anchor not found", the first time somebody
// reworded a comment. These helpers find the step by name and cut on the list
// item's indent instead.
//
// Every one of them throws when the step is not there. That is the point: a
// mutation that silently matched nothing would leave the copy correct, the pin
// green, and the case reporting a pass for something it never broke.

import { copyFile, put } from "../lib/qa.mjs";

/**
 * Where each step of the single job begins and ends, as [start, stop) line
 * indexes, with its name.
 *
 * A step opens with `- ` at the indent of the first list item under `steps:`.
 * A comment block sitting between two steps belongs to the earlier one here,
 * which is exactly what a move or a delete should carry along with it.
 */
function stepRanges(lines) {
  const stepsAt = lines.findIndex((line) => /^([ \t]+)steps:[ \t]*$/.test(line));
  if (stepsAt === -1) throw new Error("no `steps:` key in the workflow — the file's shape moved");
  const stepsIndent = lines[stepsAt].search(/\S/);
  let itemIndent = null;
  const starts = [];
  let end = lines.length;
  for (let index = stepsAt + 1; index < lines.length; index += 1) {
    if (lines[index].trim().length === 0) continue;
    if (lines[index].search(/\S/) <= stepsIndent) { end = index; break; }
    const opener = /^([ \t]*)-[ \t]+\S/.exec(lines[index]);
    if (!opener) continue;
    if (itemIndent === null) itemIndent = opener[1].length;
    if (opener[1].length === itemIndent) starts.push(index);
  }
  if (starts.length === 0) throw new Error("`steps:` holds no list items — the file's shape moved");
  return starts.map((start, position) => {
    const stop = position + 1 < starts.length ? starts[position + 1] : end;
    const named = lines.slice(start, stop).find((line) => /^[ \t]*(?:-[ \t]+)?name:/.test(line) && !/^[ \t]*#/.test(line));
    return {
      start,
      stop,
      name: named ? /name:[ \t]*(.*)$/.exec(named)[1].replace(/[ \t]#.*$/, "").trim().replace(/^["']|["']$/g, "") : null,
    };
  });
}

const locate = (lines, name) => {
  const found = stepRanges(lines).find((range) => range.name === name);
  if (!found) throw new Error(`no step named ${JSON.stringify(name)} — the file's shape moved`);
  return found;
};

/** Delete a whole step from a copy's workflow file. @throws when it is not there */
export function dropStep(dir, relative, name) {
  const lines = copyFile(dir, relative).split("\n");
  const { start, stop } = locate(lines, name);
  put(dir, relative, [...lines.slice(0, start), ...lines.slice(stop)].join("\n"));
}

/**
 * Move a whole step so it runs immediately after another one.
 * @throws when either step is missing
 */
export function moveStepAfter(dir, relative, name, afterName) {
  const lines = copyFile(dir, relative).split("\n");
  const moving = locate(lines, name);
  const block = lines.slice(moving.start, moving.stop);
  const without = [...lines.slice(0, moving.start), ...lines.slice(moving.stop)];
  const anchor = locate(without, afterName);
  put(dir, relative, [...without.slice(0, anchor.stop), ...block, ...without.slice(anchor.stop)].join("\n"));
}

/**
 * Add a line into a step's body, right after its opening line.
 * @throws when the step is not there
 */
export function addToStep(dir, relative, name, line) {
  const lines = copyFile(dir, relative).split("\n");
  const { start } = locate(lines, name);
  put(dir, relative, [...lines.slice(0, start + 1), line, ...lines.slice(start + 1)].join("\n"));
}
