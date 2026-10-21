---
description: Give course-grounded feedback on a Civ Pro practice answer by running the prompt chain
argument-hint: <answer file or pasted text> [exam id] [question] [bullets]
---

Give me feedback on: $ARGUMENTS

Follow `pack/00-INSTRUCTIONS.md` exactly, together with the notes in `AGENTS.md`. Run every stage
in `pack/01-chain.md` as its own subagent, save the stage outputs under `runs/`, and show me only
the final feedback. Don't show the band unless I ask.
