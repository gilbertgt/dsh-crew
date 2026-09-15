// T-79 DoD items 2 and 3 (PRD M1 DoD item 15) — REWRITTEN 2026-08-23 for the
// minimal READMEs. Commit 511a488 ("update code") deliberately shrank the two
// READMEs: README.md went from ~900 lines to 49 and README-zh.md from ~700 to
// 45, and the crew-process content this case used to pin (QA once per
// milestone, the three reviews one round each in parallel, a task finished
// when its own unit tests pass, the "what you may write" persona section) is
// gone on purpose. Per the PM's decision (option A), the guard keeps its
// PURPOSE — the two READMEs must say the same thing — and now pins the CURRENT
// minimal pages' actual shared content, so it can still go red on a real drift
// between them.
//
// WHAT IT PROVES. `CLAUDE.md` requires the two files to move together, English
// first, Chinese second — so the ordinary failure is not "nobody wrote it", it
// is "the English page grew a paragraph and the Chinese reader silently got a
// smaller product", or a version / a command / a heading that drifted apart.
// Every check below is a MUTUAL-CONSISTENCY check: it needs both files, and a
// FAIL line names the file and the thing, so one red line is the whole
// diagnosis.
//
// HOW THE CHECKS ARE SHAPED. Two shapes, because the two pages share two kinds
// of content:
//
//   * LANGUAGE-INDEPENDENT LITERALS — the version number, the install command,
//     the `Crew` preset name, the `ask`/`team` lane names, the `# dsh-crew`
//     title — are the SAME string in both files. For the version and the
//     install command the value is EXTRACTED from each file and compared, so a
//     change made in both files together (a deliberate bump) stays green; for
//     the identifiers the string must be present in BOTH files, so a rename in
//     one page alone goes red.
//   * TRANSLATED CONTENT — the section headings and the key sentences — can
//     never be the same string in both files, so each half is pinned per file
//     with its own language's real sentence (English anchors in English,
//     Chinese anchors in Chinese), and the en↔zh PAIR is pinned as a pair:
//     both halves must be present, or the reader of one language got a smaller
//     product.
//
// ------------------------------------------------------------------------------
// PINNING STYLE: MARKERS STRIPPED, THEN COUNTED TWICE — FLATTENED AND SQUEEZED.
// Three traps of `qa/gaps.md` meet in one file here, and the third one is
// new because one of the two files is not English.
//
//   * WRAPPING (gaps item 21). Both READMEs wrap at 100 columns, so a sentence
//     normally spans two or three lines and any line-based match reports a
//     sentence that IS there as missing. Every check here prints both numbers.
//
//   * MARKDOWN MARKERS (gaps item 27, second example). Every claim in these
//     files is bold, and one anchor sits astride a marker:
//     `Pick the **Crew** preset`. An anchor copied from the rendered page
//     would never match. So backticks, asterisks and underscores are removed
//     from BOTH the text and the anchor before matching, and the anchors below
//     are written with no markers at all.
//
//   * COLLAPSING WHITESPACE IS THE RIGHT NORMALIZATION FOR ENGLISH AND THE WRONG
//     ONE FOR CHINESE. `flat()` turns every run of whitespace into ONE SPACE,
//     which is correct for English, where the space between two words is part of
//     the sentence. In the Chinese file there is no space between two
//     characters, so a sentence that wraps mid-sentence becomes "<chars> <chars>"
//     after flattening and a correct anchor stops matching. So every anchor is
//     also counted in a SQUEEZED copy, where whitespace is removed rather than
//     collapsed, and an anchor found either way counts as present. Self-test 2
//     below proves the squeezed pass really does find an anchor broken across a
//     line; self-test 3 proves the flattened pass alone does not.
//
// WHY THE CHINESE ANCHORS ARE `\u` ESCAPES. `qa/gaps.md` item 25 says it:
// every ABSENT-or-PRESENT pin in this repository is written as an English
// string, and `README-zh.md` is the only page a Chinese-speaking user reads. A
// pin written in English cannot fire on a translated sentence. The anchors for
// the Chinese file are therefore the real Chinese sentences, written as `\u`
// escapes so this case file itself carries no Chinese character
// (`qa/T-67/case-09` uses the same device, and gaps item 24 explains why
// a Chinese character inside an English-only file matters).
//
// DELIBERATELY NOT CHECKED HERE: README version vs `package.json`. That was
// `qa/T-59/case-09`'s job, and T-59 was deleted with the README shrink.
// This case checks only that the two READMEs agree with each other;
// `package.json` consistency is `qa/T-110/case-03`'s business.
//
// BRITTLE ON PURPOSE, AND WHAT TO DO WHEN IT GOES RED. Each thing is pinned by
// whole sentences, and ALL of them must be present. Reword one of them
// legitimately and this case goes red. That is the trade `ADR 0004` describes,
// taken deliberately: the failure being guarded is a claim quietly disappearing
// from one of the two pages, and only a sentence-level anchor sees that. When a
// rewording is real, `ADR 0018` says what to do - change the anchor in the
// SAME commit as the file, and never weaken the assertion. When an anchor
// reads zero, gaps item 31 says which to doubt first: the anchor, not the file.

import { check, done, flat, repoFile } from "../lib/qa.mjs";

// ---------------------------------------------------------------- normalizing

/** Drop the markdown emphasis markers, so an anchor need not know where bold starts. */
const plain = (text) => text.replace(/[`*_]/g, "");

/** English-safe: runs of whitespace become one space. */
const flatten = (text) => flat(plain(text));

/** Chinese-safe: whitespace removed, so a wrap inside a sentence cannot hide it. */
const squeeze = (text) => plain(text).replace(/\s+/g, "");

const occurrences = (haystack, needle) => haystack.split(needle).length - 1;

/**
 * How many times `needle` occurs in `text`, counted three ways.
 * `present` is true when either whitespace-insensitive pass finds it; `line` is
 * reported only so a reader can see when a line-based pin would have lied.
 */
function counts(text, needle) {
  const line = plain(text).split("\n").filter((one) => one.includes(plain(needle))).length;
  const fl = occurrences(flatten(text), flatten(needle));
  const sq = occurrences(squeeze(text), squeeze(needle));
  return { line, flat: fl, squeeze: sq, present: fl > 0 || sq > 0 };
}

/** Word-boundary presence of one language-independent identifier (Crew, ask, team). */
const wordPresent = (text, word) => new RegExp(`\\b${word}\\b`).test(plain(text));

// ------------------------------------------------------------------ the files

const FILES = {
  en: { path: "README.md", text: repoFile("README.md") },
  zh: { path: "README-zh.md", text: repoFile("README-zh.md") },
};

// -------------------------------------------------------------- the version line
//
// Both files carry a version line near the top, and the two lines name the
// same version. `CLAUDE.md`'s rule is "keep the version line near the top of
// the README in step with package.json"; this case checks the two READMEs
// against each other (package.json is T-110's business, not this one's). The
// version is EXTRACTED, not pinned as "0.9.0", so a deliberate bump in both
// files together stays green and only a drift between the two goes red.

const VERSION_LINE_LIMIT = 10; // a reader sees it without scrolling

const enVersion = (text) => {
  const lines = plain(text).split("\n");
  const at = lines.findIndex((one) => /Version\s+\d+\.\d+\.\d+/.test(one));
  return at === -1 || at + 1 > VERSION_LINE_LIMIT ? null
    : { line: at + 1, version: /Version\s+(\d+\.\d+\.\d+)/.exec(lines[at])[1] };
};

const zhVersion = (text) => {
  const lines = plain(text).split("\n");
  const at = lines.findIndex((one) => /\u7248\u672c\s*\d+\.\d+\.\d+/.test(one)); // the zh "version" word
  return at === -1 || at + 1 > VERSION_LINE_LIMIT ? null
    : { line: at + 1, version: /\u7248\u672c\s*(\d+\.\d+\.\d+)/.exec(lines[at])[1] };
};

const enV = enVersion(FILES.en.text);
const zhV = zhVersion(FILES.zh.text);

check(
  "README.md carries a version line near the top",
  enV !== null,
  enV === null ? "no `Version x.y.z` line in the first 10 lines" : `version at line ${enV.line}`,
);
check(
  "README-zh.md carries a version line near the top",
  zhV !== null,
  zhV === null ? "no version line (the zh \u7248\u672c x.y.z shape) in the first 10 lines" : `version at line ${zhV.line}`,
);
check(
  "the two version lines name the same version",
  enV !== null && zhV !== null && enV.version === zhV.version,
  `README.md=${enV?.version ?? "none"} README-zh.md=${zhV?.version ?? "none"}`,
);

// ------------------------------------------------------------- the sections
//
// The heading SETS line up one for one. The en↔zh pair is pinned as a pair:
// both halves must be present. A section added to one page alone shows up in
// the count check; a section renamed in one page alone shows up in the pair
// check. (The `# dsh-crew` title is level 1 and is pinned separately below.)

const headingsOf = (text) => [...text.matchAll(/^## (.+)$/gm)].map((match) => match[1].trim());

const HEADING_PAIRS = [
  ["What it is", "\u9019\u662f\u4ec0\u9ebc"],       // "what it is"
  ["Install", "\u5b89\u88dd"],                       // "install"
  ["Quick start", "\u5feb\u901f\u958b\u59cb"],       // "quick start"
  ["Configuration and compatibility", "\u8a2d\u5b9a\u8207\u76f8\u5bb9\u6027"], // "configuration and compatibility"
  ["License", "\u6388\u6b0a"],                       // "license"
];

const enHeadings = headingsOf(FILES.en.text);
const zhHeadings = headingsOf(FILES.zh.text);

check(
  "the two READMEs have the same number of sections",
  enHeadings.length === zhHeadings.length,
  `README.md=${enHeadings.length} (${enHeadings.join(", ")}); README-zh.md=${zhHeadings.length} (${zhHeadings.join(", ")})`,
);

for (const [en, zh] of HEADING_PAIRS) {
  const inEn = enHeadings.includes(en);
  const inZh = zhHeadings.includes(zh);
  check(
    `the ${JSON.stringify(en)} / ${JSON.stringify(zh)} section exists in both READMEs`,
    inEn && inZh,
    `${inEn ? "" : `README.md lost section ${JSON.stringify(en)}`}${inZh ? "" : ` README-zh.md lost section ${JSON.stringify(zh)}`}`,
  );
}

// ------------------------------------------------------- the install command
//
// A shell command is language-independent: the same string must sit in both
// code blocks. The command is EXTRACTED (up to `add dsh-crew`, leaving each
// file's own trailing comment out of the comparison) and the two extractions
// compared, so a change made in both files together stays green.

const installCommand = (text) => {
  const match = /\bdsh plugin\s+--profile\s+\S+\s+add dsh-crew\b/.exec(text);
  return match ? match[0] : null;
};

const enInstall = installCommand(FILES.en.text);
const zhInstall = installCommand(FILES.zh.text);

check(
  "README.md names the install command",
  enInstall !== null,
  "no `dsh plugin --profile <p> add dsh-crew` found in README.md",
);
check(
  "README-zh.md names the install command",
  zhInstall !== null,
  "no `dsh plugin --profile <p> add dsh-crew` found in README-zh.md",
);
check(
  "the two install commands are the same command",
  enInstall !== null && zhInstall !== null && enInstall === zhInstall,
  `README.md=${enInstall ?? "none"} README-zh.md=${zhInstall ?? "none"}`,
);

// ----------------------------------------------------- the shared identifiers
//
// The title and the names a reader types or clicks: `# dsh-crew`, the `Crew`
// preset, the `ask` and `team` lanes. Each must be present in BOTH files — a
// rename in one page alone goes red. Word boundaries keep `ask` off "task"
// and `team` off words that merely contain it.

check(
  "both READMEs open with the `# dsh-crew` title",
  FILES.en.text.split("\n")[0].trim() === "# dsh-crew" && FILES.zh.text.split("\n")[0].trim() === "# dsh-crew",
  `README.md first line: ${JSON.stringify(FILES.en.text.split("\n")[0])}; README-zh.md first line: ${JSON.stringify(FILES.zh.text.split("\n")[0])}`,
);

for (const word of ["Crew", "ask", "team"]) {
  const inEn = wordPresent(FILES.en.text, word);
  const inZh = wordPresent(FILES.zh.text, word);
  check(
    `the ${JSON.stringify(word)} name is used in both READMEs`,
    inEn && inZh,
    `${inEn ? "" : "missing from README.md"}${inZh ? "" : " missing from README-zh.md"}`,
  );
}

// -------------------------------------------------------- the key sentences
//
// The claims a reader would notice, pinned per file in that file's own
// language and as a pair: both halves must be present. These are the anchors
// that catch "the English page grew a paragraph and the Chinese reader
// silently got a smaller product" inside a section the heading checks cannot
// see. The Chinese lists are the same claims as the English ones, taken from
// `README-zh.md` itself - NOT a word-for-word translation of the English
// anchor, because the Chinese page is written, not substituted, and an anchor
// invented by translating would be an anchor that never matches.

const SENTENCES = [
  {
    id: "the reader talks to the PM",
    en: "You talk only to the PM",
    zh: "\u4f60\u53ea\u548c PM \u6e9d\u901a", // "you talk only to the PM"
  },
  {
    id: "the two-lane lead-in",
    en: "Two lanes",
    zh: "\u5169\u689d lane", // "two lanes"
  },
  {
    id: "restart dsh after installing",
    en: "Restart dsh",
    zh: "\u91cd\u65b0\u555f\u52d5 dsh", // "restart dsh"
  },
  {
    id: "the quick-start last step",
    en: "Ask a question, ask for a change",
    zh: "\u63d0\u51fa\u554f\u984c\u3001\u8981\u6c42\u8b8a\u66f4", // "ask a question, ask for a change"
  },
  {
    id: "the configuration lead-in",
    en: "Crew Settings overrides are optional",
    zh: "Crew Settings override \u90fd\u662f\u9078\u7528\u7684", // "Crew Settings overrides are optional"
  },
];

for (const sentence of SENTENCES) {
  for (const key of ["en", "zh"]) {
    const file = FILES[key];
    const hit = counts(file.text, sentence[key]);
    check(
      `${file.path} says ${sentence.id}`,
      hit.present,
      `flat=${hit.flat} squeeze=${hit.squeeze} line=${hit.line} ${JSON.stringify(sentence[key])}`
        + `\n      If the page really was reworded, fix the anchor in the same commit (ADR 0018) and do not weaken this check. `
        + `If the page was not touched, doubt the anchor first (gaps item 31).`,
    );
  }
}

// ------------------------------------------------------------- the self-tests
//
// Seven of them: the finder must be able to say NO, the two normalization
// passes must each do the job they exist for, and the comparison functions
// must be able to go red — a drift between two pages is exactly what this case
// exists to catch, so each comparison is fed a drifted synthetic page and
// must report the difference. Without these, a bug that made `present` always
// true, or a comparison that always returned equal, would give green checks
// that looked at nothing.

// 1. The finder must be able to say NO.
{
  const absent = counts(FILES.en.text, "this sentence is not in either README");
  check(
    "self-test: the finder reports a made-up sentence as absent",
    absent.present === false && absent.flat === 0 && absent.squeeze === 0,
    `flat=${absent.flat} squeeze=${absent.squeeze}`,
  );
}

// 2. The squeezed pass must find a Chinese anchor that is broken across a line.
//    This is the pass that exists only for the Chinese file, and today nothing in
//    that file exercises it - no Chinese anchor happens to wrap. So the wrap is
//    made here on purpose, in a synthetic string, and the finder must still see
//    the anchor. Without this self-test the Chinese half of this case would be
//    green by luck for as long as nobody re-wraps that page.
{
  const anchor = "\u4e24\u6761\u901a\u9053"; // "two lanes"
  const wrapped = `${anchor.slice(0, 2)}\n   ${anchor.slice(2)}`;
  const seen = counts(wrapped, anchor);
  check(
    "self-test: a Chinese anchor broken across a line is still found (squeezed)",
    seen.present === true && seen.squeeze === 1,
    `flat=${seen.flat} squeeze=${seen.squeeze} line=${seen.line}`,
  );
}

// 3. And the other half of the same point, stated as a number rather than as a
//    warning: on that same wrapped text, FLATTENING ALONE fails. This is what
//    makes the squeezed pass necessary rather than decorative, and it is the
//    difference between English and Chinese wrapping written down so the next
//    person reads a measurement instead of advice.
{
  const anchor = "\u4e24\u6761\u901a\u9053"; // "two lanes"
  const wrapped = `${anchor.slice(0, 2)}\n   ${anchor.slice(2)}`;
  const flatOnly = occurrences(flatten(wrapped), flatten(anchor));
  check(
    "self-test: flattening alone does NOT find that wrapped Chinese anchor, so the squeezed pass is load-bearing",
    flatOnly === 0,
    `flattening found it ${flatOnly} time(s) - if this is no longer 0, whitespace handling changed and the comment above is stale`,
  );
}

// 4. An English anchor with markdown emphasis and a line wrap through it must be
//    found - the real pages write `Pick the **Crew** preset` and wrap the line.
{
  const anchor = "Pick the Crew preset";
  const asWritten = "Pick the **Crew**\npreset for a session.";
  const seen = counts(asWritten, anchor);
  check(
    "self-test: an English anchor is found through markdown markers and a wrap",
    seen.present === true && seen.flat === 1 && seen.line === 0,
    `flat=${seen.flat} squeeze=${seen.squeeze} line=${seen.line}`,
  );
}

// 5. The version comparison can go red: a bump in one page alone. The drifted
//    version is DERIVED from the real one (append "1"), so the self-test tracks
//    whatever version the pages actually carry and cannot go stale on a bump.
{
  const drifted = FILES.zh.text.replace(
    /\u7248\u672c\s*(\d+\.\d+\.\d+)/, // the zh "version" word
    (_, version) => `\u7248\u672c ${version}1`,
  );
  const driftedV = zhVersion(drifted);
  check(
    "self-test: a version bump in one page alone makes the two versions differ",
    enV !== null && driftedV !== null && enV.version !== driftedV.version,
    `README.md=${enV?.version ?? "none"} drifted README-zh.md=${driftedV?.version ?? "none"}`,
  );
}

// 6. The heading count can go red: a section added to one page alone.
{
  const grown = `${FILES.en.text}\n## A section only the English page has\n`;
  check(
    "self-test: a section added to one page alone makes the heading counts differ",
    headingsOf(grown).length !== headingsOf(FILES.zh.text).length,
    `grown README.md=${headingsOf(grown).length}, README-zh.md=${headingsOf(FILES.zh.text).length}`,
  );
}

// 7. The install-command comparison can go red: a change in one page alone.
//    The drifted command is DERIVED from the real one (any `--profile <p>`
//    becomes `--profile different`), so the self-test tracks whatever command
//    the pages actually carry.
{
  const drifted = FILES.en.text.replace(/--profile\s+\S+/, "--profile different");
  const driftedInstall = installCommand(drifted);
  check(
    "self-test: an install-command change in one page alone makes the commands differ",
    driftedInstall !== null && zhInstall !== null && driftedInstall !== zhInstall,
    `drifted README.md=${driftedInstall ?? "none"} README-zh.md=${zhInstall ?? "none"}`,
  );
}

// ------------------------------------------------------------------- the note
//
// Printed, not asserted: the measurement behind the pinning style. It is the
// evidence for gaps item 25 - a pin written in English cannot fire on the
// Chinese page - and a reader of the output gets the numbers rather than a
// paragraph asking them to trust one.
{
  const englishSentenceAnchors = SENTENCES.map((sentence) => sentence.en);
  const inChinese = englishSentenceAnchors.filter((anchor) => counts(FILES.zh.text, anchor).present).length;
  const lineInvisible = englishSentenceAnchors.filter((anchor) => counts(FILES.en.text, anchor).line === 0).length;
  console.log(
    `note  ${englishSentenceAnchors.length} English sentence anchors: ${inChinese} of them occur in README-zh.md `
    + `(an English pin on that file fires on ${inChinese}), and ${lineInvisible} are invisible to a line-based match in README.md`,
  );
}

done();
