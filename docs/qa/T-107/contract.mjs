// Shared helpers for the T-107 cases. This file is NOT a case: the runners only
// execute files named `case-*.mjs`.
//
// WHY THIS EXISTS. The `skip-and-split` job pins three paragraphs — A, B and C —
// as the contract four tasks copy word for word. Typing one of them into a case
// by hand is how a check goes quietly dead: one curly quote, one em dash turned
// into a hyphen, and the case is comparing the file against something nobody
// ever wrote. So the text is READ OUT of the task file at run time and used as
// data. Hand-typed here: nothing but the heading that finds it.
//
// `docs/qa/T-106/contract.mjs` is a deliberate copy of this file. Cross-importing
// between two task folders would make T-107's cases fail when T-106's folder
// moves, and a case must stand alone.
//
// PINNING STYLE: FLATTENED, with the blockquote marker removed from both sides.
// `flat()` (docs/qa/lib/qa.mjs) collapses whitespace but leaves `> ` in place, so
// a contract quoted as a blockquote in one file and as plain prose in another
// would never match. `quoteless()` below strips the marker first, so the
// comparison is about the WORDS and not about how the paragraph was framed.

import { readdirSync } from "node:fs";
import { join } from "node:path";
import { flat, REPO, repoFile } from "../lib/qa.mjs";

export { check, done, flat, repoFile } from "../lib/qa.mjs";

/** Drop the `> ` blockquote marker from every line, then flatten. */
export const quoteless = (text) => flat(text.replace(/^[ \t]*>[ \t]?/gm, "")).trim();

/** Every task file of this repository. A glob, so M2 renaming `tasks.md` cannot kill these cases. */
export function taskFiles() {
  const dir = join(REPO, "docs", "design");
  return readdirSync(dir)
    .filter((name) => /^tasks.*\.md$/.test(name))
    .sort()
    .map((name) => ({ path: join("docs", "design", name), text: repoFile(join("docs", "design", name)) }));
}

/**
 * One of the three authoritative paragraphs, read out of whichever task file
 * carries `### <letter> (English)`.
 *
 * @throws when no task file has that heading, or more than one does. Both are
 * loud on purpose: a case that silently compared the file against an empty
 * string would pass for ever.
 */
export function contract(letter) {
  const heading = `### ${letter} (English)`;
  const carriers = taskFiles().filter((file) => file.text.includes(heading));
  if (carriers.length !== 1) {
    throw new Error(
      `${carriers.length} task file(s) carry "${heading}" (${carriers.map((file) => file.path).join(", ") || "none"})`
      + " — the authoritative text of the skip-and-split job has moved, and every case reading it is now testing nothing",
    );
  }
  const text = carriers[0].text;
  const start = text.indexOf(heading) + heading.length;
  const rest = text.slice(start);
  const end = rest.search(/\n#{1,3} /);
  const body = end === -1 ? rest : rest.slice(0, end);
  const quoted = body.split("\n").filter((line) => line.trimStart().startsWith(">"));
  if (quoted.length === 0) throw new Error(`"${heading}" in ${carriers[0].path} holds no blockquote lines`);
  const paragraph = quoteless(quoted.join("\n"));
  if (paragraph.length < 200) throw new Error(`"${heading}" is only ${paragraph.length} characters — too short to be the paragraph`);
  return { text: paragraph, source: carriers[0].path };
}

/**
 * The **bold** spans of a paragraph, in order, markers stripped.
 *
 * WHY THIS EXISTS (`ADR 0027`). The load-bearing half-sentences of the
 * authoritative paragraphs are the ones their author put in bold — the
 * condition, the option, the refusal. A case that hand-types those strings stops
 * following the paragraph the day it is reworded, and the correct work is then
 * failed by a stale check. That happened once in this job already: paragraph A's
 * skip condition was rewritten by the second security review, and a hand-typed
 * check went red on a prompt that had copied the NEW text correctly.
 *
 * So the strings are read out of the paragraph instead. What stays hand-written
 * is only which span to look for, never the words inside it.
 */
export const boldSpans = (paragraph) =>
  [...paragraph.matchAll(/\*\*(.+?)\*\*/g)].map((hit) => hit[1].trim());
