# QA protocol

How the prompts in this repo were tuned, and how to keep tuning them if you remix it.

## What the benchmark can establish

The hosted app was calibrated against a band-stratified set of real graded final-exam answers
(one each at DS, H, P, LP for the 2015 and 2019 finals). Those answers are **not** in this
repository; they are students' work. To recreate the loop, install your own graded answers
(see [`content/graded-answers/README.md`](../content/graded-answers/README.md)).

The chain never sees an answer's known grade while grading it. Graded answers enter the blind
evaluation only as *other* answers' anchors. When you calibrate against an answer that is also
among your graded anchors, leave it out of that run's anchor pack so it cannot anchor itself. The actual band is
revealed only afterwards, to the separate `calibration_analysis` stage.

## Running a calibration pass

1. Give the model a graded answer whose band you know. Ask for a **calibration run**: stages 1–8
   blind, with that answer excluded from the anchor pack, and the real band withheld until they
   finish.
2. Then have it run stage 9, `calibration_analysis`, from `pack/01-chain.md` with the actual band
   (and any grader comments) revealed.
3. Read the final feedback next to the audit: the band, per-criterion coverage, and the judge's
   findings.

Run the **whole** fixture set at each prompt version, never only the prior failures. Bands are
ordered DS > H > P > LP; report exact-band rate and mean ordinal distance, but never optimize to
those alone.

## Human review rubric

Rate each run on these questions:

- **Accuracy:** Is every stated rule, application critique, and quotation supported?
- **Coverage:** Did it identify the highest-value omissions and errors?
- **Specificity:** Could this feedback only have been written for this answer?
- **Pedagogy:** Does each priority tell the student what to do differently next time?
- **Proportionality:** Do the tone and emphasis fit how serious the issue is?
- **Grounding:** Do the cited source excerpts actually support the associated claim?
- **Retrieval:** Are the stage 4 search terms doctrine vocabulary actually present in the course
  materials, rather than invented authority? Do the stage 5 reasons explain why each selected
  excerpt matters to the weighted issues?
- **Band discrimination:** Does the blind evaluation separate central errors from secondary or bonus
  omissions, use the exam's actual point allocation, and explain both adjacent-band boundaries?

5 = publish as-is · 4 = minor edit · 3 = useful but needs a material edit · 2 = unreliable in important places · 1 = unsafe or fundamentally misdirected.

## Prompt iteration discipline

- Change one meaningful element at a time.
- Bump the prompt version at the top of `pack/01-chain.md` for every comparison-worthy change, and note it with each run you keep.
- Re-run the complete fixture set, not only prior failures.
- Compare human ratings and written failure categories alongside band distance.
- Keep the current answer's known grade and grader comments out of its blind prompts.
- Log each review round in [`prompt-feedback-log.md`](prompt-feedback-log.md). Record what the reviewer saw, what you verified in the stored run, what you changed, and what you deliberately did *not* change. Every prompt rule should trace back to an observed defect.

## Lessons already paid for

These are in the prompts for a reason; read the log before removing one.

- **Conservatism belongs in deterministic code, never in prompts.** One version stacked "DS is rare"
  base-rate language, an in-prompt hedge-down instruction, and a lower-band tie rule. Every answer,
  including a DS, collapsed to P. The evaluator prompt now explicitly says scarcity in a real
  cohort is not a quota (step 3a).
- **Every later stage subtracted accuracy.** A stage-level audit found the blind evaluators were the
  most accurate components. Separate band-calibration stages, cross-judges, and confidence tie-breaks
  all made banding worse. That is why the band now comes straight from `blind_evaluation`.
- **The coach must not see the anchors.** `feedback_draft` gets the evaluation, not the exam, the model
  answer, or the graded references, so band comparisons can't leak into student-facing prose.
- **Same-exam anchors beat other years.** A different cohort's curve doesn't transfer. Another year's
  answer fills a band only when the same-exam stack is thin. When it is the *sole* reference for a
  band, it must be treated as a full comparator, or that band becomes unreachable.
- **Reviewer feedback was overwhelmingly about prose, not doctrine.** Most of the drafting rules in
  the coach and judge prompts came from it. Examples: one idea per sentence, no coined terms of art,
  enumerate every multi-element test, pair every addition with a cut, and organize by exam question.
