---
description: Run the Civ Pro feedback chain on a practice answer (harness mode, or API mode if .env has a key)
argument-hint: <answer file> [exam id] [question, e.g. "Question 2"] [bullets]
---

Run the Civil Procedure feedback chain on: $ARGUMENTS

Follow AGENTS.md exactly.

1. Run `npm install` if `node_modules/` is missing.
2. Identify the answer file, the exam ID (check `npm run exams`), the scope (whole exam or
   one question), and the mode (full draft or bullet points). Ask only for what you can't infer.
3. If `.env` has an `ANTHROPIC_API_KEY` (or an OpenAI-compatible key), use API mode:
   `npm run feedback -- --exam … --answer …`.
4. Otherwise use harness mode: `npm run civpro -- new …`. Then, for each stage, run `render`,
   give the prompt file to a **fresh subagent** (sonnet for fast/work tiers, opus for
   evaluator/judge) that writes `<stage>.draft.json`, and run `check`. Repeat until the
   chain completes.
5. Show me `feedback.md`. Don't show the band unless I ask.
