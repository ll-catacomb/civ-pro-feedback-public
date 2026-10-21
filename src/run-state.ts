import fs from "node:fs";
import path from "node:path";

import { getExam } from "./exams";
import { PROMPT_VERSION, submissionContext } from "./prompts";
import { retrieveCourseContext } from "./retrieval";
import type {
  Exam,
  GradeBand,
  IssueMap,
  RetrievalQuery,
  RetrievedSource,
  SourceRerank,
  SubmissionFitAssessment,
  SubmissionFitJudge,
  SubmissionMode,
  SubmissionScope,
} from "./types";

const RETRIEVAL_CANDIDATE_LIMIT = 48;
const FINAL_SOURCE_LIMIT = 24;

export type RunInput = {
  examId: string;
  scope: SubmissionScope;
  mode: SubmissionMode;
  questionRef?: string;
  /** Only for calibration_analysis. Never read by the blind chain. */
  actualGrade?: GradeBand;
  graderComments?: string;
  /** Graded-answer id (e.g. "2019-h") to keep out of the anchor pack. */
  excludeGradedAnswer?: string;
  promptVersion: string;
  createdAt: string;
};

/**
 * Everything about one run lives in one directory: the input, the answer, and
 * one JSON file per completed stage. That makes every run resumable, auditable,
 * and drivable either by `civpro run` (API) or by an agent harness one stage at
 * a time (`civpro render` / `civpro check`).
 */
export class RunState {
  readonly input: RunInput;
  readonly answer: string;
  readonly exam: Exam;
  readonly submissionBrief: string;

  constructor(readonly dir: string) {
    const inputPath = path.join(dir, "input.json");
    if (!fs.existsSync(inputPath)) throw new Error(`${dir} is not a run directory (no input.json). Create one with \`npm run civpro -- new\`.`);
    this.input = JSON.parse(fs.readFileSync(inputPath, "utf8"));
    this.answer = fs.readFileSync(path.join(dir, "answer.md"), "utf8").trim();
    this.exam = getExam(this.input.examId);
    this.submissionBrief = submissionContext({
      scope: this.input.scope,
      mode: this.input.mode,
      questionRef: this.input.questionRef,
      kind: this.exam.kind,
      modelAnswerKind: this.exam.modelAnswerKind,
    });
  }

  static create(dir: string, input: Omit<RunInput, "promptVersion" | "createdAt">, answer: string): RunState {
    if (answer.trim().length < 120) throw new Error("The answer is under 120 characters; there is nothing to grade.");
    if (input.scope === "single_question" && !input.questionRef) throw new Error("A single-question run needs --question (e.g. \"Question 2\").");
    getExam(input.examId);
    fs.mkdirSync(dir, { recursive: true });
    const full: RunInput = { ...input, promptVersion: PROMPT_VERSION, createdAt: new Date().toISOString() };
    fs.writeFileSync(path.join(dir, "input.json"), `${JSON.stringify(full, null, 2)}\n`);
    fs.writeFileSync(path.join(dir, "answer.md"), `${answer.trim()}\n`);
    return new RunState(dir);
  }

  file(name: string): string {
    return path.join(this.dir, name);
  }

  has(stage: string): boolean {
    return fs.existsSync(this.file(`${stage}.json`));
  }

  skipped(stage: string): boolean {
    return fs.existsSync(this.file(`${stage}.skipped`));
  }

  read<T>(stage: string): T | undefined {
    return this.has(stage) ? JSON.parse(fs.readFileSync(this.file(`${stage}.json`), "utf8")) as T : undefined;
  }

  require<T>(stage: string): T {
    const value = this.read<T>(stage);
    if (value === undefined) throw new Error(`Stage ${stage} has not completed in ${this.dir}.`);
    return value;
  }

  write(stage: string, value: unknown): void {
    fs.writeFileSync(this.file(`${stage}.json`), `${JSON.stringify(value, null, 2)}\n`);
    fs.rmSync(this.file(`${stage}.skipped`), { force: true });
  }

  markSkipped(stage: string, reason: string): void {
    fs.writeFileSync(this.file(`${stage}.skipped`), `${reason}\n`);
  }

  /** Both intake passes must agree, confidently, before the chain stops at zero. */
  isZeroCredit(): boolean {
    const first = this.read<SubmissionFitAssessment>("submission_fit");
    const judge = this.read<SubmissionFitJudge>("submission_fit_judge");
    if (!first || !judge) return false;
    return [first, judge].every((pass) => pass.status === "nonresponsive"
      && pass.recommendation === "zero_credit"
      && pass.responsivenessScore === 0
      && pass.confidence >= 0.9);
  }

  /**
   * BM25 over the course corpus (local, no model). Runs once, after the issue
   * map and the optional query expansion; the result is frozen in
   * candidates.json so the rerank stage and every later stage see the same set.
   */
  async prepareCandidates(): Promise<RetrievedSource[]> {
    if (fs.existsSync(this.file("candidates.json"))) return this.candidates();
    const query = this.read<RetrievalQuery>("retrieval_query");
    const expansionTerms = query
      ? [...query.criterionQueries.flatMap((entry) => entry.terms), ...query.crossCuttingTerms]
      : [];
    const candidates = await retrieveCourseContext(
      { issueMap: this.require<IssueMap>("issue_map"), answer: this.answer, expansionTerms },
      RETRIEVAL_CANDIDATE_LIMIT,
    );
    fs.writeFileSync(this.file("candidates.json"), `${JSON.stringify(candidates, null, 2)}\n`);
    return candidates;
  }

  candidates(): RetrievedSource[] {
    const filePath = this.file("candidates.json");
    if (!fs.existsSync(filePath)) throw new Error("Retrieval candidates are not prepared yet. Run `civpro render retrieval_rerank` (or `civpro retrieve`) first.");
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  }

  /** Reranked selections first, unselected candidates backfill, capped at 24. */
  sources(): RetrievedSource[] {
    const filePath = this.file("sources.json");
    if (fs.existsSync(filePath)) return JSON.parse(fs.readFileSync(filePath, "utf8"));
    const candidates = this.candidates();
    const rerank = this.read<SourceRerank>("retrieval_rerank");
    let sources = candidates.slice(0, FINAL_SOURCE_LIMIT);
    if (rerank) {
      const byId = new Map(candidates.map((source) => [source.id, source]));
      const chosen = new Set<string>();
      const selected = rerank.selections.flatMap((selection) => {
        const source = byId.get(selection.sourceId);
        if (!source || chosen.has(selection.sourceId)) return [];
        chosen.add(selection.sourceId);
        return [{ ...source, rerankRelevance: selection.relevance, rerankReason: selection.reason }];
      });
      sources = [...selected, ...candidates.filter((source) => !chosen.has(source.id))].slice(0, FINAL_SOURCE_LIMIT);
    }
    fs.writeFileSync(filePath, `${JSON.stringify(sources, null, 2)}\n`);
    return sources;
  }
}
