import type { z } from "zod";

import { buildAnchorPack } from "./anchors";
import { formatExamMatches, rankExamMatches } from "./exam-match";
import {
  calibrationAnalysisDeveloperPrompt,
  coachDeveloperPrompt,
  coachUserPrompt,
  evaluationDeveloperPrompt,
  evaluationUserPrompt,
  judgeDeveloperPrompt,
  judgeUserPrompt,
  queryExpansionDeveloperPrompt,
  queryExpansionUserPrompt,
  rubricDeveloperPrompt,
  rubricUserPrompt,
  sourceRerankDeveloperPrompt,
  sourceRerankUserPrompt,
  submissionFitDeveloperPrompt,
  submissionFitJudgeDeveloperPrompt,
  submissionFitJudgeUserPrompt,
  submissionFitUserPrompt,
} from "./prompts";
import { formatSources } from "./retrieval";
import type { RunState } from "./run-state";
import {
  CalibrationAnalysisSchema,
  EvaluationSchema,
  FeedbackSchema,
  IssueMapSchema,
  JudgeSchema,
  RetrievalQuerySchema,
  SourceRerankSchema,
  SubmissionFitAssessmentSchema,
  SubmissionFitJudgeSchema,
  type Evaluation,
  type Feedback,
  type IssueMap,
  type SubmissionFitAssessment,
} from "./types";

export type ModelTier = "fast" | "work" | "evaluator" | "judge";
export type Effort = "low" | "medium" | "high" | "xhigh";

export type StageDefinition = {
  name: string;
  /** One line for humans and harness agents. */
  purpose: string;
  tier: ModelTier;
  effort: Effort;
  /** A failed optional stage degrades the run instead of aborting it. */
  optional?: boolean;
  schema: z.ZodType<unknown>;
  system: string;
  user: (state: RunState) => string;
};

/**
 * The live chain, in order. Each stage is one structured-output model call:
 * a system prompt, one user message, and a Zod schema the output must satisfy.
 * No stage sees a later stage's output, and no stage sees a known grade.
 * See PROMPT-CHAIN.md for the diagram.
 */
export const STAGES: StageDefinition[] = [
  {
    name: "submission_fit",
    purpose: "Intake gate: does this answer respond to the selected exam at all?",
    tier: "fast",
    effort: "high",
    schema: SubmissionFitAssessmentSchema,
    system: submissionFitDeveloperPrompt,
    user: (state) => submissionFitUserPrompt({
      exam: state.exam.prompt,
      answer: state.answer,
      submission: state.submissionBrief,
    }),
  },
  {
    name: "submission_fit_judge",
    purpose: "Independent conservative re-check of the intake gate.",
    tier: "judge",
    effort: "high",
    schema: SubmissionFitJudgeSchema,
    system: submissionFitJudgeDeveloperPrompt,
    user: (state) => submissionFitJudgeUserPrompt({
      exam: state.exam.prompt,
      answer: state.answer,
      firstPass: state.require<SubmissionFitAssessment>("submission_fit"),
      localExamMatches: formatExamMatches(rankExamMatches(state.answer, state.exam.promptPath)),
      submission: state.submissionBrief,
    }),
  },
  {
    name: "issue_map",
    purpose: "Point-aware rubric built from the exam and the instructor model answer.",
    tier: "work",
    effort: "medium",
    schema: IssueMapSchema,
    system: rubricDeveloperPrompt,
    user: (state) => rubricUserPrompt({
      exam: state.exam.prompt,
      modelAnswer: state.exam.modelAnswer,
      sources: "Additional course sources are retrieved after the issue map is built. Use the exam and instructor model answer for this stage.",
      submission: state.submissionBrief,
    }),
  },
  {
    name: "retrieval_query",
    purpose: "Expand each criterion into the keywords the course materials actually use.",
    tier: "fast",
    effort: "low",
    optional: true,
    schema: RetrievalQuerySchema,
    system: queryExpansionDeveloperPrompt,
    user: (state) => queryExpansionUserPrompt({
      issueMap: state.require<IssueMap>("issue_map"),
      answer: state.answer,
    }),
  },
  {
    name: "retrieval_rerank",
    purpose: "Pick the ≤24 BM25 candidates that actually support the issue map.",
    tier: "fast",
    effort: "low",
    optional: true,
    schema: SourceRerankSchema,
    system: sourceRerankDeveloperPrompt,
    user: (state) => sourceRerankUserPrompt({
      issueMap: state.require<IssueMap>("issue_map"),
      answer: state.answer,
      candidates: formatSources(state.candidates()),
    }),
  },
  {
    name: "blind_evaluation",
    purpose: "Score every criterion 0–4, record defects, pick a band against graded anchors.",
    tier: "evaluator",
    effort: "high",
    schema: EvaluationSchema,
    system: evaluationDeveloperPrompt,
    user: (state) => evaluationUserPrompt({
      exam: state.exam.prompt,
      modelAnswer: state.exam.modelAnswer,
      answer: state.answer,
      issueMap: state.require<IssueMap>("issue_map"),
      sources: formatSources(state.sources()),
      anchors: buildAnchorPack(state.exam.id, state.input.excludeGradedAnswer),
      submission: state.submissionBrief,
    }),
  },
  {
    name: "feedback_draft",
    purpose: "The coach: turn the evaluation into student-facing feedback, by question.",
    tier: "work",
    effort: "medium",
    schema: FeedbackSchema,
    system: coachDeveloperPrompt,
    // Deliberately no exam, model answer, or anchors: the coach works from the
    // evaluation's findings so band comparisons cannot leak into the prose.
    user: (state) => coachUserPrompt({
      answer: state.answer,
      issueMap: state.require<IssueMap>("issue_map"),
      evaluation: state.require<Evaluation>("blind_evaluation"),
      sources: formatSources(state.sources()),
      submission: state.submissionBrief,
    }),
  },
  {
    name: "judge_and_revise",
    purpose: "Skeptical final pass: verify, enforce the drafting rules, return corrected feedback.",
    tier: "judge",
    effort: "high",
    schema: JudgeSchema,
    system: judgeDeveloperPrompt,
    user: (state) => judgeUserPrompt({
      exam: state.exam.prompt,
      modelAnswer: state.exam.modelAnswer,
      answer: state.answer,
      issueMap: state.require<IssueMap>("issue_map"),
      evaluation: state.require<Evaluation>("blind_evaluation"),
      draft: state.require<Feedback>("feedback_draft"),
      sources: formatSources(state.sources()),
      submission: state.submissionBrief,
    }),
  },
];

/**
 * Post-hoc QA, not part of a student run. Only meaningful when you know the
 * answer's real band (e.g. one of your graded answers), and it runs strictly
 * after the blind chain has finished.
 */
export const CALIBRATION_STAGE: StageDefinition = {
  name: "calibration_analysis",
  purpose: "Compare the finished chain against the answer's known band; recommend prompt changes.",
  tier: "judge",
  effort: "medium",
  schema: CalibrationAnalysisSchema,
  system: calibrationAnalysisDeveloperPrompt,
  user: (state) => {
    const actual = state.input.actualGrade;
    if (!actual) throw new Error("calibration_analysis needs the answer's actual band: pass --actual DS|H|P|LP.");
    const evaluation = state.require<Evaluation>("blind_evaluation");
    const judge = state.require<{ feedback: Feedback; findings: unknown }>("judge_and_revise");
    const order = ["DS", "H", "P", "LP"];
    const distance = Math.abs(order.indexOf(evaluation.provisionalBand) - order.indexOf(actual));
    const agreement = distance === 0 ? "exact" : distance === 1 ? "adjacent" : "material_miss";
    return `ACTUAL BAND\n${actual}\n\nPREDICTED BAND\n${evaluation.provisionalBand}\n\nORDINAL BAND DISTANCE\n${distance}\n\nEXPECTED GRADE AGREEMENT LABEL\n${agreement}\n\nHISTORICAL GRADER FEEDBACK\n${state.input.graderComments ?? "No narrative grader feedback was supplied for this answer. This is a grade-only benchmark."}\n\nEXAM\n${state.exam.prompt}\n\nINSTRUCTOR MODEL ANSWER\n${state.exam.modelAnswer}\n\nSTUDENT ANSWER\n${state.answer}\n\nCHAIN ISSUE MAP\n${JSON.stringify(state.require("issue_map"), null, 2)}\n\nCHAIN BLIND EVALUATION\n${JSON.stringify(evaluation, null, 2)}\n\nCHAIN FINAL STUDENT FEEDBACK\n${JSON.stringify(judge.feedback, null, 2)}\n\nCHAIN JUDGE FINDINGS\n${JSON.stringify(judge.findings, null, 2)}`;
  },
};

export const ALL_STAGES = [...STAGES, CALIBRATION_STAGE];

export function getStage(name: string): StageDefinition {
  const stage = ALL_STAGES.find((candidate) => candidate.name === name);
  if (!stage) throw new Error(`Unknown stage "${name}". Stages: ${ALL_STAGES.map((s) => s.name).join(", ")}`);
  return stage;
}
