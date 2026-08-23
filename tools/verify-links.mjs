// Checks every internal markdown link in this repository: the target of an
// inline link (`[text](path)`, `![alt](path)`) or of a reference definition
// (`[id]: path`) must resolve to a file that exists in the repo. Run it with:
//
//   node tools/verify-links.mjs
//
// Q3 of the issue-8 backlog (prd-2026-08-23-issue8-docs-qa-backlog.md). The
// repository's docs quote commands and config snippets that LOOK like links —
// `^[a-z0-9]([a-z0-9-]*[a-z0-9])?$` is one of them — so only real markdown
// syntax counts: fenced code blocks and inline code spans are not read.
//
// What is deliberately not checked:
//   - external links: any target with a URI scheme (http:, https:, mailto:, …);
//   - pure anchors: `#section` — no file part to check;
//   - the anchor half of `path#section`: the file part is checked, the anchor
//     is not (this is a link checker, not an id checker).
//   - reference links with no definition: CommonMark renders `[text][id]` with
//     no `[id]:` line as literal text, so there is nothing pointing anywhere.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

let failures = 0;
const fail = (message) => { failures += 1; console.error(`FAIL  ${message}`); };
const ok = (message) => console.log(`ok    ${message}`);

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// node_modules is a symlink to dsh's own install, not repo files, and .git is
// not repo files either. Skipped by name at any depth, so a link INTO either of
// them reds below instead of silently passing against a real file.
const SKIP_DIRS = new Set([".git", "node_modules"]);

/** Every `*.md` file under `dir`, never entering `.git` or `node_modules`. */
function findMarkdown(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory() && !entry.isSymbolicLink()) {
      files.push(...findMarkdown(path));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(path);
    }
  }
  return files;
}

// An inline link's target: `[text](dest)` or `![alt](dest)`. One line, because
// a target that spans lines is vanishingly rare and this is a lightweight
// check; `[^)\n]+` needs at least one character, so `[text]()` is not read.
const INLINE = /!?\[[^\]]*\]\(([^)\n]+)\)/g;
// A reference definition's bare target: `[id]: path`. Footnotes (`[^1]: …`) are
// prose, not links, so a label that starts with `^` is not read.
const DEFINITION = /^ {0,3}\[(?!\^)[^\]]+\]:[ \t]*(\S+)/gm;

/**
 * The link destinations of one file's text, as `{ line, target }` pairs.
 * Fenced code blocks are dropped whole, and inline code spans are dropped from
 * the lines that remain, so a regex quoted in backticks cannot be read as a
 * link.
 */
function destinations(text) {
  const found = [];
  let fenced = false;
  for (const [index, line] of text.split("\n").entries()) {
    if (line.trimStart().startsWith("```")) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;
    const plain = line.replace(/`[^`\n]*`/g, "");
    for (const match of plain.matchAll(INLINE)) {
      found.push({ line: index + 1, target: match[1] });
    }
    for (const match of plain.matchAll(DEFINITION)) {
      found.push({ line: index + 1, target: match[1] });
    }
  }
  return found;
}

/** A target's file part, or null when the link points at no file. */
function filePart(target) {
  let dest = target.trim();
  // `[text](<path with spaces>)` — the angle brackets are CommonMark's way of
  // letting a destination contain spaces; they are not part of the path.
  if (dest.startsWith("<") && dest.endsWith(">")) dest = dest.slice(1, -1);
  // `[text](path "title")` — a title is not part of the path.
  dest = dest.replace(/[ \t]+"[^"]*"[ \t]*$/, "").trim();
  // A pure anchor points at the same file; a URI scheme points outside the
  // repository. Neither names a file to check.
  if (dest === "" || dest.startsWith("#")) return null;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(dest)) return null;
  // `path#section` and `path?raw=1` name `path`; the fragment/query is not a
  // file part. (A pure `#…` never gets here — it returned above.)
  return dest.split(/[?#]/)[0] || null;
}

/**
 * Whether `target`, resolved against the file `mdFile` sits in, names a file
 * that really exists in the repository: inside the repo root, outside `.git`
 * and `node_modules`, and present on disk. A link to a directory passes —
 * the target exists; this check is about broken targets, not about style.
 */
function existsInRepo(mdFile, target) {
  const resolved = resolve(dirname(mdFile), target);
  const rel = relative(packageRoot, resolved);
  if (rel.startsWith("..")) return false; // escapes the repository
  if (rel.split(sep).some((part) => SKIP_DIRS.has(part))) return false;
  return existsSync(resolved);
}

const files = findMarkdown(packageRoot);
if (files.length === 0) {
  fail("no markdown file found under the repository, so this check would pass without reading a single link — the tree's shape moved");
  console.log(`\n${failures} link check(s) failed`);
  process.exit(1);
}
ok(`${files.length} markdown file(s) found`);

let links = 0;
for (const file of files) {
  const shown = relative(packageRoot, file);
  const found = destinations(readFileSync(file, "utf8"));
  const internal = found.filter(({ target }) => filePart(target) !== null);
  if (internal.length === 0) continue;
  links += internal.length;
  ok(`${shown}: ${internal.length} link(s) checked`);
  for (const { line, target } of internal) {
    const path = filePart(target);
    if (!existsInRepo(file, path)) {
      fail(`${shown}:${line}: broken link \`${target}\` — \`${path}\` is not a file in this repository`);
    }
  }
}

if (failures === 0) {
  ok("every internal markdown link points to a file that exists in the repository");
}
console.log(`\n${files.length} markdown file(s), ${links} internal link(s) checked`);
console.log(failures === 0 ? "all markdown link checks passed" : `${failures} markdown link check(s) failed`);
process.exit(failures === 0 ? 0 : 1);
