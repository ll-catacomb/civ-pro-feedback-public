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

## How to install them

Save each answer as Markdown or plain text named `<exam year>-<band>.md`:

```
content/graded-answers/2019-ds.md
content/graded-answers/2019-h.md
content/graded-answers/2019-p.md
content/graded-answers/2019-lp.md
content/graded-answers/2015-h-second.md   ← optional suffix if you have more than one
```

The year must match an exam ID from `npm run exams` (`2019` → `2019-final`). Then run
`npm run exams`; the last line lists what was picked up.

Same-exam answers are preferred for each band. Other years fill only the bands the same-exam
stack lacks.

**They stay private.** `.gitignore` excludes every file in this folder except this README, so a
fork you push won't publish them.

## Calibrating against one of them

```bash
npm run civpro -- run --exam 2019-final --answer content/graded-answers/2019-h.md --exclude 2019-h --out runs/cal-2019-h
npm run civpro -- calibrate --run runs/cal-2019-h --actual H
```

`--exclude` keeps the answer from anchoring its own run. See [docs/QA.md](../../docs/QA.md).
