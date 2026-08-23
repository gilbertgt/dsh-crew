// T-108 DoD items 2 and 3 (PRD M1 item 6): both READMEs tell the user that "not
// in scope" lists only things with a real cost — and that what the PM simply did
// not do stays off the list, so asking for it later overturns nothing.
//
// What it proves: the promise reached the reader who is affected by it. This half
// is the one the user feels: a short "not in scope" list is only trustworthy if
// the reader knows what its shortness means. Told nothing, a user reads a short
// list as an oversight and a long one as a wall, and both readings cost them.
//
// It also pins the second half of the promise — that an item NOT on the list is
// theirs to ask for. A page that describes only what goes in the list leaves the
// user exactly where they were.
//
// What it does NOT prove: that a real "not in scope" list in a real PRD obeys the
// rule. That is judged per item, per job, by a person.
//
// PINNING STYLE: FLATTENED, sliced to list item 3 of each README.

import { check, done, flat, readmes } from "../T-59/readmes.mjs";

function listItem(text, number) {
  const lines = text.split("\n");
  const first = lines.findIndex((line) => new RegExp(`^${number}\\. `).test(line));
  if (first === -1) throw new Error(`no top-level list item ${number}.`);
  const next = lines.findIndex((line, index) => index > first && new RegExp(`^${number + 1}\\. `).test(line));
  return lines.slice(first, next === -1 ? lines.length : next).join("\n");
}

const [english, chinese] = readmes();
const en = flat(listItem(english.text, 3));
const zh = flat(listItem(chinese.text, 3));

// ---------------------------------------------------------------- English
check(
  'README.md says "not in scope" only lists things with a real cost',
  /"Not in scope" only lists things with a real cost/i.test(en),
  "the rule is not stated on the English page at all",
);

check(
  "it gives the two costs that qualify: finished work rebuilt, or a crossing that cannot be undone",
  /has to be built again/i.test(en) && /cannot be undone/i.test(en),
  "without both halves the user cannot tell what kind of wall an item is",
);

check(
  "it gives the undoable half by example, so the reader can recognise one",
  /package published/i.test(en) && /tag pushed/i.test(en) && /data deleted/i.test(en),
  '"cannot be undone" with no examples is a phrase, not something a reader can apply',
);

check(
  "it says what stays OUT: something the PM simply did not do",
  /simply did not do/i.test(en) && /a little more work/i.test(en),
  "this is the half that changed; a page stating only the inclusion rule says nothing new",
);

check(
  "it says what the reader may do with an item that is not on the list",
  /(yours to ask for|not on it is yours)/i.test(en),
  "the user is told the list is honest but not that they may simply ask — which is the whole benefit",
);

// ---------------------------------------------------------------- Chinese
check(
  "README-zh.md carries the same rule, in Chinese",
  /不在范围内/.test(zh) && /真代价/.test(zh),
  "the Chinese page does not state the rule",
);

check(
  "it gives the same two costs",
  /重做一遍/.test(zh) && /撤不回来/.test(zh),
  "one of the two qualifying costs is missing from the Chinese page",
);

check(
  "it gives the same examples",
  /包发出去/.test(zh) && /tag 推了/.test(zh) && /数据删了/.test(zh),
  "the examples are what make the rule usable, and they are missing",
);

check(
  "it says what stays out: the thing the PM merely did not get to",
  /顺手没做/.test(zh) && /不写进去/.test(zh),
  "the half that changed is missing from the Chinese page",
);

check(
  "it says the reader may just ask for anything not on the list",
  /直接说/.test(zh),
  "the benefit is missing from the Chinese page",
);

// -------------------------------------- the same promise, where CRDs are explained
// The user meets "not in scope" in the interview section and meets CRDs much
// further down. A reader who only reaches the CRD section must not be left
// thinking a skipped question costs them a change request.
const enAll = english.flat;
const zhAll = chinese.flat;

check(
  "README.md also says, where it explains CRDs, that an undecided question is not scope",
  /left undecided in the interview is not scope/i.test(enAll) && /needs no CRD/i.test(enAll),
  "the CRD section still implies that anything the user asks for later is a change of scope",
);

check(
  "README-zh.md says it too",
  /先不定/.test(zhAll) && /不需要任何 CRD/.test(zhAll),
  "the Chinese CRD section still implies a change request is needed",
);

done();
