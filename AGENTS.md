# Agent instructions: civ-pro-feedback-public

This repo is a Civil Procedure practice-exam feedback chain: eight structured model calls
that turn a student's practice answer into question-by-question, course-grounded feedback.
You (Claude Code, Codex, or another coding agent) can run it in two ways:

1. **API mode.** The user has an API key in `.env`. Run
   `npm run feedback -- --exam <id> --answer <file>` and show them `runs/<id>/feedback.md`.
2. **Harness mode.** No key needed: **you are the model.** You drive the chain one stage at a
   time with the CLI. Each stage's prompt is rendered to a file and answered in a fresh context,
   and the CLI validates every output against the stage's schema.

If the user just says "give me feedback on my answer", ask which exam it answers (or infer it
from `npm run exams`), whether it is the whole exam or one question, and whether it is a full
draft or bullet points. Then use API mode if `.env` has a key, harness mode otherwise.

## Setup

```bash
npm install              # once
npm run exams            # every practicable exam/assignment ID, plus any graded anchors installed
```

Save the student's answer to a file (e.g. `my-answer.md`) if it isn't one already.

## Harness mode protocol

```bash
npm run civpro -- new --exam 2019-final --answer my-answer.md \
    [--question "Question 2"] [--mode bullet_points]
# → creates runs/<id>/ and names the next stage
```

Then loop until the CLI says the chain is complete:

1. `npm run civpro -- render --run runs/<id>` writes `runs/<id>/prompts/<stage>.md`. That file
   contains the stage's full system prompt, its user message, and a JSON Schema output contract.
2. **Answer that one file in a fresh context.** Write *only* the JSON value to
   `runs/<id>/<stage>.draft.json`.
   - **Claude Code:** spawn a subagent for every stage, with this prompt: *"Read
     `runs/<id>/prompts/<stage>.md` and nothing else in the repo. Act as the model it describes:
     follow the SYSTEM PROMPT, respond to the USER MESSAGE, and write only the JSON value that
     satisfies the output contract to `runs/<id>/<stage>.draft.json`. Do not summarize it back
     to me."* Match the model to the tier in the file's first line: `fast`/`work` → sonnet,
     `evaluator`/`judge` → opus.
   - **Codex:** run each stage as its own non-interactive session, e.g.
     `codex exec "Read runs/<id>/prompts/<stage>.md and nothing else. Act as the model it describes and write only the JSON output to runs/<id>/<stage>.draft.json."`
3. `npm run civpro -- check --run runs/<id>` validates the draft and promotes it to
   `<stage>.json`. If validation fails, the error says which field is wrong: fix the draft (or
   re-run the stage) and check again.
4. Repeat. `retrieval_query` and `retrieval_rerank` are optional. If one keeps failing,
   `npm run civpro -- skip --run runs/<id>` and the chain falls back to plain BM25.
5. When the chain completes, the CLI writes `runs/<id>/feedback.md` (student-facing) and
   `runs/<id>/audit.md` (band, criterion scores, judge findings). Show the user `feedback.md`.

If both intake stages find the answer nonresponsive to the chosen exam, the CLI stops with
zero credit. Tell the user. Usually it means they picked the wrong exam.

### Why the isolation matters, and what not to do

The stages are deliberately blind to each other. That separation is most of why the feedback
is good:

- **Do not grade the answer yourself** or "improve" a stage's output with your own view. The
  rendered prompt is the whole instruction.
- **Do not read the exam, the model answer, `content/graded-answers/`, or earlier stage
  outputs into your own context** and then carry them into a later stage. In particular, the
  coach (`feedback_draft`) is intentionally *not* given the exam, the model answer, or the graded
  anchors, so band comparisons can't leak into student-facing prose.
- **Never show the student the band** (DS/H/P/LP) unless they explicitly ask for `audit.md`. It is
  an internal calibration signal, not a grade.
- Don't edit `content/` to make a run "work". If an exam is missing, say so.

If your harness can't give each stage a fresh context, still answer each prompt file on its own
terms. Tell the user that the stages weren't isolated.

## Editing the chain (remixing)

| To change… | Edit |
|---|---|
| A prompt's wording | `src/prompts.ts`, then bump `PROMPT_VERSION` and run `npm run civpro -- prompts` to refresh `prompts/` |
| Which stages run, their order, inputs, model tier, or effort | `src/stages.ts` |
| An output schema | `src/types.ts` (the Zod schemas are the contract) |
| Retrieval (BM25 weights, chunking) | `src/retrieval.ts` |
| Band anchors | `src/anchors.ts`; the anchor files themselves go in `content/graded-answers/` |
| Providers / models | `src/providers.ts` and `.env` |
| How feedback is rendered | `src/report.ts` |

Always run `npm run typecheck` after editing TypeScript. Read `docs/QA.md` and
`docs/prompt-feedback-log.md` before deleting a prompt rule: almost every rule traces back to
a reviewer-observed defect.
