import fs from "node:fs";
import path from "node:path";

import { ROOT } from "./paths";
import type { Exam, GradeBand } from "./types";

const ASSIGNMENTS_DIRECTORY = path.join(ROOT, "content", "course", "assignments");
/**
 * Graded final-exam answers are not shipped with this repository: they are real
 * students' work. Drop your own here as `<year>-<band>.md` (e.g. `2019-ds.md`,
 * `2019-h.md`, `2015-lp.md`) and the evaluator will rank against them. See
 * content/graded-answers/README.md for where to find them.
 */
export const GRADED_ANSWERS_DIRECTORY = path.join(ROOT, "content", "graded-answers");
const GRADED_FILE = /^(\d{4})-(ds|h|p|lp)(?:-[a-z0-9-]+)?\.md$/i;
const EXEMPLARS_PER_PACK = 2;
const EXEMPLAR_WORD_LIMIT = 1100;

export type GradedAnswer = { id: string; examId: string; band: GradeBand; path: string };

function examYear(examId: Exam["id"]): string {
  return examId.slice(0, 4);
}

function stripFrontmatter(markdown: string): string {
  return markdown.replace(/^---\n[\s\S]*?\n---\n/, "").trim();
}

function truncateWords(text: string, limit: number): string {
  const words = text.split(/\s+/);
  if (words.length <= limit) return text;
  return `${words.slice(0, limit).join(" ")} […]`;
}

export function listGradedAnswers(): GradedAnswer[] {
  let files: string[];
  try {
    files = fs.readdirSync(GRADED_ANSWERS_DIRECTORY).sort();
  } catch {
    return [];
  }
  return files.flatMap((file) => {
    const match = GRADED_FILE.exec(file);
    if (!match) return [];
    return [{
      id: file.replace(/\.md$/, "").toLowerCase(),
      examId: `${match[1]}-final`,
      band: match[2].toUpperCase() as GradeBand,
      path: path.join(GRADED_ANSWERS_DIRECTORY, file),
    }];
  });
}

/**
 * Graded final-exam answers, one per band where available. Graders rank within
 * a stack, and bands are curved within a cohort, so a same-exam graded answer is
 * the best anchor for each band; other years fill bands the same-exam stack
 * lacks. `excludeId` keeps an answer from anchoring its own run (use it when
 * calibrating against an answer that is also in the folder).
 */
export function gradedAnchorFixtures(examId: Exam["id"], excludeId?: string) {
  const all = listGradedAnswers();
  const candidates = all.filter((answer) => answer.id !== excludeId);
  const sameExamCount = candidates.filter((candidate) => candidate.examId === examId).length;
  const excludedBand = excludeId ? all.find((answer) => answer.id === excludeId)?.band : undefined;
  const anchors: {
    band: GradeBand;
    id: string;
    sameExam: boolean;
    substituting: boolean;
    answer: string;
    note: string;
  }[] = [];
  for (const band of ["DS", "H", "P", "LP"] as const) {
    const fixture = candidates.find((candidate) => candidate.band === band && candidate.examId === examId)
      ?? (sameExamCount < 2 || band === excludedBand
        ? candidates.find((candidate) => candidate.band === band && candidate.examId !== examId)
        : undefined);
    if (!fixture) continue;
    const sameExam = fixture.examId === examId;
    const substituting = !sameExam && band === excludedBand;
    anchors.push({
      band,
      id: fixture.id,
      sameExam,
      substituting,
      answer: stripFrontmatter(fs.readFileSync(fixture.path, "utf8")),
      note: sameExam
        ? `A complete graded answer to THIS same exam. The instructor graded it ${band}.`
        : substituting
          ? `A complete answer to the ${examYear(fixture.examId)} final in this same course. The instructor graded it ${band}. This is the ONLY reference available for the ${band} band on this run, and it is a full comparator, not background texture — treat it exactly as you would a same-exam ${band} answer. An answer comparable to it is ${band}. Do not discount it for coming from another year; if you do, ${band} becomes unreachable no matter how strong the answer under review is.`
          : `A complete answer to the ${examYear(fixture.examId)} final in this same course (a different cohort, graded on that cohort's curve). The instructor graded it ${band}.`,
    });
  }
  return anchors;
}

/**
 * Assignment answers the instructor selected as the best in the class, from the
 * same course year. Different assessments, so they anchor what selected work
 * looks like without leaking anything about the exam under review.
 */
export function exemplarAssignmentAnswers(examId: Exam["id"]): string[] {
  const year = examYear(examId);
  let files: string[];
  try {
    files = fs.readdirSync(ASSIGNMENTS_DIRECTORY);
  } catch {
    return [];
  }
  return files
    .filter((file) => file.startsWith(`${year}-assignment-01-`) && file.includes("model-answer"))
    .sort()
    .slice(0, EXEMPLARS_PER_PACK)
    .map((file) => truncateWords(
      stripFrontmatter(fs.readFileSync(path.join(ASSIGNMENTS_DIRECTORY, file), "utf8")),
      EXEMPLAR_WORD_LIMIT,
    ));
}

export function buildAnchorPack(examId: Exam["id"], excludeId?: string): string {
  const graded = gradedAnchorFixtures(examId, excludeId);
  const exemplars = exemplarAssignmentAnswers(examId);
  if (graded.length === 0 && exemplars.length === 0) {
    return "No reference answers are available for this run.";
  }

  const sections: string[] = [
    "How to use these reference answers: they respond to DIFFERENT assessments, so use them only to calibrate what each band of real, time-pressured student work looks like — depth, prioritization, and how many errors and omissions each band tolerates. Never use them as doctrinal authority for the exam under review, and never reference or infer any author's identity.",
  ];
  if (graded.length === 0) {
    sections.push("No graded final-exam answers are installed for this run, so there is no band ladder to rank against. Record your best band judgment from the band definitions alone, and say in bandRationale that it is unanchored.");
  }
  for (const anchor of graded) {
    const scope = anchor.sameExam
      ? " (same exam)"
      : anchor.substituting
        ? ` (different year — sole reference for ${anchor.band}, full comparator)`
        : " (different year)";
    sections.push(`## Graded reference answer${scope} — actual instructor band: ${anchor.band}\n${anchor.note}\n\n${anchor.answer}`);
  }
  exemplars.forEach((exemplar, index) => {
    sections.push(`## Instructor-selected assignment answer ${index + 1}\nA real student answer to a short timed assignment in this course, circulated by the instructor as among the best in the class. Note that even selected answers contain imperfections.\n\n${exemplar}`);
  });
  return sections.join("\n\n");
}
