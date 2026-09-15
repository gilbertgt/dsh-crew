// Task T-136 — DoD item 7.
// Proves only that the durable qa/gaps.md marker records the review-evidence gap; it emits SKIP/manual-gate and never asserts a review passed.

import { check, done, flat, repoFile } from "../lib/qa.mjs";

const GAP_HEADING = "## 63. Review evidence 的路径与可重复核对方式未定义，DoD item 只能人工判定";
const GAP_MARKER = "T-136 DoD item 7 要求 code/security/QA/doc review report 与 Verdicts";
const GAP_LIMIT = "repository-local QA case 无法判定四种 review 是否完成";
const GAP_REASON = "QA plan/job folder 是 single-use，finish 后会删除；case 若唯一读 plan 就不可重跑";
const GAP_MANUAL_GATE = "若硬写 review 通过判断，则会把 manual gate 假装成 pass";
const GAP_ACTION = "PM 在 review reports 落地后人工核对 Verdicts 和四份报告";
const GAP_AUTOMATION = "若要自动化，先定义持久 report 路径、格式与命令，再新增 case";
const GAP_STATUS = "**状态**：未关闭，按设计如此（manual gate）";

let gaps = "";
let readError = "";
try {
  gaps = repoFile("qa/gaps.md");
} catch (error) {
  readError = String(error?.message ?? error);
}

const headingCopies = gaps.split(GAP_HEADING).length - 1;
const start = gaps.indexOf(GAP_HEADING);
const end = start === -1 ? -1 : gaps.indexOf("\n## ", start + GAP_HEADING.length);
const gapSection = start === -1 ? "" : gaps.slice(start, end === -1 ? undefined : end);
const flattened = flat(gapSection);

check(
  "repository-local qa/gaps.md is readable",
  readError === "",
  readError || "unable to read qa/gaps.md",
);
check(
  "qa/gaps.md contains exactly one durable Case 07 gap marker",
  headingCopies === 1 && start !== -1,
  `found ${headingCopies} copy/copies of ${GAP_HEADING}`,
);
check(
  "the durable marker identifies T-136 DoD item 7 and all four review kinds",
  flattened.includes(GAP_MARKER),
  `missing ${GAP_MARKER}`,
);
check(
  "the durable marker says a repository-local case cannot判定 the four reviews",
  flattened.includes(GAP_LIMIT),
  `missing ${GAP_LIMIT}`,
);
check(
  "the durable marker records that the plan and job folder are single-use",
  flattened.includes(GAP_REASON),
  `missing ${GAP_REASON}`,
);
check(
  "the durable marker explains why a review-pass assertion would be false",
  flattened.includes(GAP_MANUAL_GATE),
  `missing ${GAP_MANUAL_GATE}`,
);
check(
  "the durable marker leaves evidence checking as PM manual work",
  flattened.includes(GAP_ACTION),
  `missing ${GAP_ACTION}`,
);
check(
  "the durable marker names what must be defined before automation",
  flattened.includes(GAP_AUTOMATION),
  `missing ${GAP_AUTOMATION}`,
);
check(
  "the durable marker remains explicitly open as a manual gate",
  flattened.includes(GAP_STATUS),
  `missing ${GAP_STATUS}`,
);

console.log("SKIP  T-136 DoD item 7: review evidence remains a manual-gate; this case only guards durable qa/gaps.md section 63.");
console.log("manual-gate  PM must later inspect the T-136 Verdicts and code/security/QA/doc review reports; this case does not mark any review as passed.");

done();
