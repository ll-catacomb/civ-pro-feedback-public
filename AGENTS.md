# Agent instructions

This repository is a context pack plus a runbook for a Civil Procedure practice-exam feedback
chain. There is no code to run.

When the user wants feedback on a practice answer, **follow [`pack/00-INSTRUCTIONS.md`](pack/00-INSTRUCTIONS.md)
exactly.** It defines the intake, the eight stages (in `pack/01-chain.md`), retrieval over the
course materials, and how to present the result.

Because you have file and sub-task access:

- Read the exam, model answer, and course sources from `pack/` or from the individual files in
  `content/course/`. The two hold the same text.
- Run each stage as its own sub-task or subagent. Give it only that stage's system prompt,
  assembled inputs, and output fields. In Claude Code, use sonnet for fast/work-tier stages and
  opus for evaluator/judge-tier stages.
- Save stage outputs to `runs/<date>-<item-id>/<NN>-<stage>.json`, and write the final
  `feedback.md` there too.
- Search the course materials with grep or your search tool for the retrieval step. Never use
  `content/course/exams/` as a retrieval source.
- Graded anchors, if the user has any, are in `content/graded-answers/<year>-<band>.md`.

When the user wants to **change** the chain, edit `pack/01-chain.md` and
`pack/02-course-conventions.md` directly. After changing anything under `content/`, run
`python3 tools/build-pack.py` to rebuild the bundles. Read `docs/QA.md` and
`docs/prompt-feedback-log.md` before removing any prompt rule.
