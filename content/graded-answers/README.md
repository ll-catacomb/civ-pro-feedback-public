# Graded reference answers (bring your own)

The blind evaluator ranks your answer against real graded answers, one per band where available:
**DS** (strongest), **H**, **P**, **LP** (weakest). The hosted app shipped with a set of these.
This public repo does **not**, because they are other students' graded work.

Without them the chain still runs end to end. The band in `audit.md` is then unanchored, and the
evaluator is told so. The student-facing feedback in `feedback.md` never shows a band either way.

## Where to find them (HLS students)

- **Your course Canvas site.** Professor Greiner circulates high-scoring answers to past finals
  alongside the practice exams. Check the course's Files / Modules.
- **The HLS Registrar's Exam Archive** ([Registrar → Examinations](https://hls.harvard.edu/registrar/examinations)).
  It holds past exams from fall 2010 onward, behind HarvardKey. Some courses post sample or
  high-scoring answers with the exam.
- **The Harvard Law Library's guide to past exams** ([Prepare for HLS Exams → Past Exams](https://guides.library.harvard.edu/c.php?g=459765&p=3143793)).

Use only answers that were shared with you for this purpose. Keep them local; see below.

## How to add them

Save each answer as Markdown or plain text, named `<exam year>-<band>.md`:

```
2019-ds.md   2019-h.md   2019-p.md   2019-lp.md   2015-h.md …
```

- **Claude desktop with this folder open (Cowork / Claude Code):** put the files in this folder
  (`content/graded-answers/`).
- **A Project in Claude, ChatGPT, etc.:** upload them alongside the `pack/` files, renamed with a
  `graded-` prefix (`graded-2019-h.md`) so the model can tell them apart from course material.

The year must match an exam in `pack/03-exam-index.md` (`2019` means `2019-final`). Answers to
the same exam are preferred as anchors; other years fill only the bands that exam lacks.

**Keep them private.** `.gitignore` excludes every file in this folder except this README, so a
fork you push won't publish them. Don't share a Project that contains them.

## Testing the chain against one of them

Tell the model: *"Calibration run: here is a graded answer to the 2019 final. Run stages 1–8
blind without using it as an anchor, then run stage 9 with the actual band, H."* See
[docs/QA.md](../../docs/QA.md).
