// Not a QA case — the one mutation the cases beside it cannot write as a string
// swap. The runners only execute `case-*.mjs`, so this file never runs alone.
//
// Deleting the whole `permissions:` block means deleting a key and everything
// indented under it, and in publish.yml that includes a seven-line comment. An
// `edit()` anchor covering all of it would be a copy of the file pasted into a
// case, and it would break with a confusing "anchor not found" the first time
// somebody reworded a comment. So the block is cut on indentation instead.
//
// It throws when the key is not there: a mutation that silently matched nothing
// would leave the copy correct, the pin green, and the case reporting a pass for
// a grant it never removed.

import { copyFile, put } from "../lib/qa.mjs";

/**
 * Delete a mapping key and every line indented deeper than it.
 *
 * @param dir - a tempRepo() copy
 * @param relative - the file inside it
 * @param key - the key's name, matched on its own line
 * @throws when the file has no such key
 */
export function dropKeyBlock(dir, relative, key) {
  const lines = copyFile(dir, relative).split("\n");
  const at = lines.findIndex((line) => new RegExp(`^[ \\t]*${key}[ \\t]*:`).test(line));
  if (at === -1) throw new Error(`no \`${key}:\` key in ${relative} — the file's shape moved`);
  const indent = lines[at].search(/\S/);
  let stop = at + 1;
  while (stop < lines.length && (lines[stop].trim().length === 0 || lines[stop].search(/\S/) > indent)) stop += 1;
  put(dir, relative, [...lines.slice(0, at), ...lines.slice(stop)].join("\n"));
}

/**
 * Replace a mapping key's whole block with `replacement` (a list of lines).
 * @throws when the file has no such key
 */
export function replaceKeyBlock(dir, relative, key, replacement) {
  const lines = copyFile(dir, relative).split("\n");
  const at = lines.findIndex((line) => new RegExp(`^[ \\t]*${key}[ \\t]*:`).test(line));
  if (at === -1) throw new Error(`no \`${key}:\` key in ${relative} — the file's shape moved`);
  const indent = lines[at].search(/\S/);
  let stop = at + 1;
  while (stop < lines.length && (lines[stop].trim().length === 0 || lines[stop].search(/\S/) > indent)) stop += 1;
  put(dir, relative, [...lines.slice(0, at), ...replacement, ...lines.slice(stop)].join("\n"));
}
