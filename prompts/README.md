# Prompts

Generated from `src/prompts.ts` by `npm run civpro -- prompts` — prompt version `civpro-feedback-v4.26.0`. Edit the TypeScript, not these files.

| # | Stage | Tier | Effort | Purpose |
|---|---|---|---|---|
| 01 | [submission_fit](01-submission_fit.md) | fast | high | Intake gate: does this answer respond to the selected exam at all? |
| 02 | [submission_fit_judge](02-submission_fit_judge.md) | judge | high | Independent conservative re-check of the intake gate. |
| 03 | [issue_map](03-issue_map.md) | work | medium | Point-aware rubric built from the exam and the instructor model answer. |
| 04 | [retrieval_query](04-retrieval_query.md) | fast | low | Expand each criterion into the keywords the course materials actually use. |
| 05 | [retrieval_rerank](05-retrieval_rerank.md) | fast | low | Pick the ≤24 BM25 candidates that actually support the issue map. |
| 06 | [blind_evaluation](06-blind_evaluation.md) | evaluator | high | Score every criterion 0–4, record defects, pick a band against graded anchors. |
| 07 | [feedback_draft](07-feedback_draft.md) | work | medium | The coach: turn the evaluation into student-facing feedback, by question. |
| 08 | [judge_and_revise](08-judge_and_revise.md) | judge | high | Skeptical final pass: verify, enforce the drafting rules, return corrected feedback. |
| 09 | [calibration_analysis](09-calibration_analysis.md) | judge | medium | Compare the finished chain against the answer's known band; recommend prompt changes. |

The user message each stage receives is built in `src/stages.ts`; render a real one with `npm run civpro -- render`.
