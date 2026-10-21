import { z } from "zod";

export const GradeBandSchema = z.enum(["DS", "H", "P", "LP"]);
export type GradeBand = z.infer<typeof GradeBandSchema>;

export const SubmissionFitAssessmentSchema = z.object({
  status: z.enum(["responsive", "nonresponsive", "uncertain"]),
  responsivenessScore: z.number().int().min(0).max(100),
  questionCoverage: z.array(z.object({
    questionLabel: z.string(),
    addressed: z.boolean(),
    answerEvidence: z.string(),
  })),
  selectedExamEvidence: z.array(z.string()),
  mismatchEvidence: z.array(z.string()),
  likelyOtherExam: z.string(),
  recommendation: z.enum(["full_evaluation", "zero_credit", "manual_review"]),
  rationale: z.string(),
  confidence: z.number().min(0).max(1),
});
export type SubmissionFitAssessment = z.infer<typeof SubmissionFitAssessmentSchema>;

export const SubmissionFitJudgeSchema = z.object({
  status: z.enum(["responsive", "nonresponsive", "uncertain"]),
  responsivenessScore: z.number().int().min(0).max(100),
  recommendation: z.enum(["full_evaluation", "zero_credit", "manual_review"]),
  agreesWithFirstPass: z.boolean(),
  controllingEvidence: z.array(z.string()),
  likelyOtherExam: z.string(),
  rationale: z.string(),
  confidence: z.number().min(0).max(1),
});
export type SubmissionFitJudge = z.infer<typeof SubmissionFitJudgeSchema>;

export const AssessmentOutcomeSchema = z.object({
  creditStatus: z.enum(["evaluated", "zero_nonresponsive", "manual_review"]),
  score: z.number().int().min(0).max(100).nullable(),
  rationale: z.string(),
});
export type AssessmentOutcome = z.infer<typeof AssessmentOutcomeSchema>;

export const SourceSchema = z.object({
  id: z.string(),
  title: z.string(),
  path: z.string(),
  excerpt: z.string(),
  score: z.number(),
  // "hybrid" only appears on runs persisted before v4.2.0, when the semantic
  // half of retrieval was an embedding index; "expanded_lexical" is BM25 over
  // the doctrine vocabulary named by the retrieval-query stage.
  retrievalMethod: z.enum(["hybrid", "expanded_lexical", "lexical_fallback"]).optional(),
  semanticScore: z.number().optional(),
  lexicalScore: z.number().optional(),
  rerankRelevance: z.number().int().min(1).max(4).optional(),
  rerankReason: z.string().optional(),
});
export type RetrievedSource = z.infer<typeof SourceSchema>;

export const RetrievalQuerySchema = z.object({
  criterionQueries: z.array(z.object({
    criterionId: z.string(),
    terms: z.array(z.string()).min(1).max(40),
  })).min(1).max(40),
  crossCuttingTerms: z.array(z.string()).max(40),
});
export type RetrievalQuery = z.infer<typeof RetrievalQuerySchema>;

export const SourceRerankSchema = z.object({
  selections: z.array(z.object({
    sourceId: z.string(),
    relevance: z.number().int().min(1).max(4),
    reason: z.string(),
  })).min(1).max(24),
  uncoveredRisks: z.array(z.string()),
});
export type SourceRerank = z.infer<typeof SourceRerankSchema>;

export const CalibrationAnalysisSchema = z.object({
  evidenceBasis: z.enum(["narrative_feedback", "grade_only"]),
  gradeAgreement: z.enum(["exact", "adjacent", "material_miss", "not_applicable"]),
  summary: z.string(),
  alignedFindings: z.array(z.object({
    chainFinding: z.string(),
    benchmarkEvidence: z.string(),
    assessment: z.string(),
  })),
  missedFindings: z.array(z.object({
    benchmarkEvidence: z.string(),
    chainCoverage: z.string(),
    severity: z.enum(["low", "medium", "high"]),
  })),
  unsupportedOrOverstatedFindings: z.array(z.object({
    chainFinding: z.string(),
    problem: z.string(),
    severity: z.enum(["low", "medium", "high"]),
  })),
  promptRecommendations: z.array(z.object({
    targetStage: z.enum(["submission_fit", "issue_map", "retrieval", "evaluation", "feedback_draft", "judge", "band_calibration", "claude_chain", "cross_judge", "feedback_merge", "final_decision"]),
    problem: z.string(),
    proposedChange: z.string(),
    evidence: z.string(),
  })),
});
export type CalibrationAnalysis = z.infer<typeof CalibrationAnalysisSchema>;

export const CriterionSchema = z.object({
  id: z.string(),
  label: z.string(),
  // The exam's stated point value for this scored question/subpart. Null when
  // the exam supplies no allocation. This is deliberately not normalized.
  weight: z.number().nonnegative().nullable(),
  expectedAnalysis: z.array(z.string()),
  commonFailures: z.array(z.string()),
  authoritySourceIds: z.array(z.string()),
});

export const IssueMapSchema = z.object({
  examOverview: z.string(),
  criteria: z.array(CriterionSchema).min(1),
  crossCuttingSkills: z.array(z.string()),
  uncertaintyNotes: z.array(z.string()),
});
export type IssueMap = z.infer<typeof IssueMapSchema>;

export const EvaluationSchema = z.object({
  criteria: z.array(
    z.object({
      criterionId: z.string(),
      coverage: z.number().int().min(0).max(4),
      finding: z.string(),
      answerEvidence: z.string(),
      sourceIds: z.array(z.string()),
      errorType: z.enum([
        "none",
        "omission",
        "rule_error",
        "application_gap",
        "counterargument_gap",
        "organization",
        "unsupported_assertion",
      ]),
    }),
  ),
  strengths: z.array(z.string()),
  priorityGaps: z.array(z.string()),
  provisionalBand: GradeBandSchema,
  // Where the answer sits inside its band; "high" renders as a shoulder flag
  // (e.g. H+). Optional so runs persisted before v4.1.0 still validate.
  bandLean: z.enum(["low", "solid", "high"]).optional(),
  bandRationale: z.string(),
  whyNotHigher: z.string(),
  whyNotLower: z.string(),
  confidence: z.number().min(0).max(1),
});
export type Evaluation = z.infer<typeof EvaluationSchema>;

// `questionRef` binds a card to one exam question so feedback can be presented
// question by question instead of as a priority gradient. Reviewers asked for
// this in both the 2015 P and 2015 DS rounds: students work practice exams one
// question at a time, and v4.6.0 output interleaved questions (Q4, Q2, Q4, Q4,
// Q4, Q1, Q3, craft, Q2) with only 2 of 9 cards naming their question at all.
// Optional so runs persisted before v4.8.0 still validate; current prompts
// always emit it. Use the exam's own label ("Question 2", "Question 4(b)").
// `crossCutting` is the escape hatch for genuine whole-exam patterns.
const QuestionRefSchema = z.object({
  questionRef: z.string().optional(),
  crossCutting: z.boolean().optional(),
});

export const FeedbackSchema = z.object({
  headline: z.string(),
  overview: z.string(),
  strengths: z.array(
    z.object({
      label: z.string(),
      detail: z.string(),
      answerExcerpt: z.string(),
      sourceIds: z.array(z.string()),
    }).extend(QuestionRefSchema.shape),
  ),
  improvements: z.array(
    z.object({
      priority: z.enum(["high", "medium", "low"]),
      label: z.string(),
      // Optional so persisted runs from before v4.25.0 remain readable. Current
      // prompts request a short exact quote to make each critique easy to find
      // in the full submitted response shown alongside the feedback.
      answerExcerpt: z.string().optional(),
      whatHappened: z.string(),
      whyItMatters: z.string(),
      howToImprove: z.string(),
      sourceIds: z.array(z.string()),
    }).extend(QuestionRefSchema.shape),
  ),
  revisionPlan: z.array(z.string()),
  exampleRevision: z.string(),
  // The questionRef whose improvements this example rewrites, so the UI can show
  // it beside that question instead of stranding it at the end where it reads as
  // a summary. Optional: pre-v4.11.0 runs have no ref and fall back to the tail.
  exampleRevisionRef: z.string().optional(),
  // The exact improvement label the example demonstrates. Optional for stored
  // runs created before the UI attached examples to individual cards.
  exampleRevisionTarget: z.string().optional(),
  closing: z.string(),
});
export type Feedback = z.infer<typeof FeedbackSchema>;

export const JudgeSchema = z.object({
  approved: z.boolean(),
  qualityScore: z.number().int().min(0).max(100),
  checks: z.object({
    doctrinalGrounding: z.number().int().min(0).max(4),
    answerSpecificity: z.number().int().min(0).max(4),
    pedagogicalUsefulness: z.number().int().min(0).max(4),
    internalConsistency: z.number().int().min(0).max(4),
    calibrationDiscipline: z.number().int().min(0).max(4),
  }),
  findings: z.array(
    z.object({
      severity: z.enum(["note", "warning", "critical"]),
      claim: z.string(),
      problem: z.string(),
      correction: z.string(),
      sourceIds: z.array(z.string()),
    }),
  ),
  feedback: FeedbackSchema,
});
export type JudgeResult = z.infer<typeof JudgeSchema>;

/**
 * How much of the exam the student is turning in. Reviewers asked for both:
 * students work practice exams one question at a time, and a single-question
 * submission must not be graded as if it were a whole-exam attempt.
 */
export const SubmissionScopeSchema = z.enum(["full_exam", "single_question"]);
export type SubmissionScope = z.infer<typeof SubmissionScopeSchema>;

/**
 * What form the work is in. A bullet outline is a legitimate way to practice
 * issue-spotting and structure under time pressure, and must not be marked down
 * for lacking prose it was never meant to have.
 */
export const SubmissionModeSchema = z.enum(["full_draft", "bullet_points"]);
export type SubmissionMode = z.infer<typeof SubmissionModeSchema>;

export const StageTraceSchema = z.object({
  name: z.string(),
  model: z.string(),
  reasoningEffort: z.string(),
  durationMs: z.number(),
  inputTokens: z.number().optional(),
  outputTokens: z.number().optional(),
  responseId: z.string().optional(),
});
export type StageTrace = z.infer<typeof StageTraceSchema>;

/**
 * A final exam, or one of the shorter graded assignments. They differ in ways
 * the chain has to know about — an assignment poses a single question under an
 * ~850-word limit, and its "model answers" are exemplary STUDENT papers rather
 * than an instructor's key — so the kind travels with the item.
 */
export type PracticeItemKind = "final" | "assignment";

/**
 * What the supplied benchmark actually is. `instructor_key` was written by the
 * instructor without time pressure and sits above full credit. `peer_exemplars`
 * are real student answers produced under the same limit the student is working
 * to, so they represent achievable, not aspirational, work. Grading a student
 * against the wrong one distorts the comparison in opposite directions.
 */
export type ModelAnswerKind = "instructor_key" | "peer_exemplars";

export type Exam = {
  // `<year>-final` or `<year>-assignment-<NN>`. Open rather than a literal union
  // since v4.16.0: items are discovered from the corpus, so adding one is a
  // content change rather than a code change. Validate with isKnownExamId.
  id: string;
  kind: PracticeItemKind;
  modelAnswerKind: ModelAnswerKind;
  year: number;
  title: string;
  shortDescription: string;
  questionCount: number;
  prompt: string;
  modelAnswer: string;
  promptPath: string;
  modelAnswerPath: string;
};
