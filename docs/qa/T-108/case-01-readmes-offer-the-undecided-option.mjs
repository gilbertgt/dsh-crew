// T-108 DoD items 1 and 3 (PRD M1 item 6): both READMEs tell the USER — not the
// crew — that a question can be left undecided, and that taking that option puts
// the thing nowhere in the opening document.
//
// What it proves: the rule reached the page the user actually reads, in the
// section about the interview, in BOTH languages. That last part is the one that
// rots: `CLAUDE.md` requires the two files to move together, English first, and
// nothing else in `npm test` compares their content. A rule the user is never
// told about is a rule they cannot use — the whole benefit here is the user
// knowing they may say "leave it".
//
// What it does NOT prove: that the two paragraphs say the same thing, or that the
// Chinese reads well. The words are meant to differ; a doc reviewer judges them.
// This is the mechanical half: both files carry the idea, in the same section,
// with the same load-bearing parts.
//
// PINNING STYLE: FLATTENED, and sliced to list item 3 — the interview item — in
// each file. A phrase found in the CRD section further down would not tell a user
// reading about the interview anything.

import { check, done, flat, readmes } from "../T-59/readmes.mjs";

/** List item `n` of the top-level numbered list, from `^n. ` to `^<n+1>. `. */
function listItem(text, number) {
  const lines = text.split("\n");
  const first = lines.findIndex((line) => new RegExp(`^${number}\\. `).test(line));
  if (first === -1) throw new Error(`no top-level list item ${number}.`);
  const next = lines.findIndex((line, index) => index > first && new RegExp(`^${number + 1}\\. `).test(line));
  return lines.slice(first, next === -1 ? lines.length : next).join("\n");
}

const [english, chinese] = readmes();

// ---------------------------------------------------------------- English
const enItem = listItem(english.text, 3);
const en = flat(enItem);

console.log(`README.md item 3: ${enItem.length} characters over ${enItem.split("\n").length} lines`);

check(
  "README.md item 3 really is the interview item",
  /interviews you/i.test(en),
  `item 3 reads: ${JSON.stringify(en.slice(0, 120))} — the list moved, so the assertions below are about the wrong item`,
);

check(
  "README.md tells the user a question can be left undecided",
  /leave a question undecided/i.test(en) && /leave it undecided/i.test(en),
  "the user is never told the option exists, so they will answer every question as if it bound them",
);

check(
  "it says what the option depends on: whether the work can start without the answer",
  /(work can start|start .{0,20}without your answer)/i.test(en),
  "without the condition the option reads as a way to duck any question, including the ones that decide what gets built",
);

check(
  "it says the consequence: the thing goes nowhere in the opening document",
  /nowhere in the opening document/i.test(en),
  "this is the promise the user is being given; without it the option is just a delay",
);

check(
  "it names all three places it will not appear",
  /table of what the interview settled/i.test(en) && /not in "not in scope"/i.test(en) && /"still\s+undecided"/i.test(en),
  'a user who sees the skipped question turn up under "still undecided" has been told something untrue',
);

check(
  "it says what that buys the user: ask later, nothing to overturn",
  /nothing to\s+overturn/i.test(en),
  "the benefit is the point of telling the user at all",
);

check(
  "it says a question that cannot be skipped carries no such option, and the PM says why",
  /no such option/i.test(en) && /why that one cannot be skipped/i.test(en),
  "otherwise a user meeting a question with no option assumes the PM forgot",
);

// ---------------------------------------------------------------- Chinese
const zhItem = listItem(chinese.text, 3);
const zh = flat(zhItem);

console.log(`README-zh.md item 3: ${zhItem.length} characters over ${zhItem.split("\n").length} lines`);

check(
  "README-zh.md item 3 really is the interview item",
  /访谈你/.test(zh),
  `item 3 reads: ${JSON.stringify(zh.slice(0, 80))}`,
);

check(
  "README-zh.md carries the option, in Chinese",
  /先不定/.test(zh),
  "the Chinese page does not offer the option at all, so a Chinese reader gets a smaller product",
);

check(
  "it states the same condition: can the work start without the answer",
  /开工/.test(zh),
  "the condition is what stops the option from applying to every question",
);

check(
  "it states the same consequence: not one word in the opening document",
  /开局文档/.test(zh) && /一个字都不写/.test(zh),
  "the promise the English page makes is not on the Chinese page",
);

check(
  "it names the same three places",
  /面谈定下来的那张表/.test(zh) && /不在范围内/.test(zh) && /还没定的事/.test(zh),
  "one of the three places is missing from the Chinese page",
);

check(
  "it says the same benefit: ask later, nothing to overturn",
  /推翻/.test(zh),
  "the Chinese reader is told the mechanism but not what it is worth to them",
);

check(
  "and it says a question that cannot be skipped has no such option",
  /没有这个选项/.test(zh) && /跳不掉/.test(zh),
  "the limit on the option is missing from the Chinese page",
);

// The Chinese page must actually be Chinese, and the English page must not have
// picked up Chinese: a reverse proof that the two slices are not the same text.
check(
  "the two slices really are two different languages",
  /[一-鿿]/.test(zh) && !/[一-鿿]/.test(en),
  "one of the two pages is in the other's language — the slices may both be pointing at the same file",
);

done();
