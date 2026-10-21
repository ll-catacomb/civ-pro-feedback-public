# Course content

Everything the chain grades against or retrieves from, as Markdown with YAML frontmatter.
Most files were extracted and cleaned from PDFs, Word documents, slides, and recordings with
AI assistance, so spot-check anything load-bearing against the original.

| Folder | What it is | How the chain uses it |
|---|---|---|
| `course/exams/` | Past Civil Procedure finals (2007–2025) and Professor Greiner's model answers | The exam and model answer are given directly to the issue map, evaluator and judge. Exams are **excluded** from retrieval. |
| `course/assignments/` | Short graded assignments, each with exemplary student answers the instructor circulated to the class | Practicable as their own items (peer-exemplar benchmark); also retrievable as writing exemplars that never surface in student-facing feedback |
| `course/casebook/` | The online casebook (per class day) and case writeups | Retrieval (BM25) |
| `course/lectures-videos/` | Class and topic summaries | Retrieval |
| `course/slides-(pictures)/` | Transcribed slides and whiteboard diagrams | Retrieval |
| `course/primers/` | Statute primers, glossary, overviews | Retrieval |
| `course/rules-statutes-constitution/` | FRCP rules, long-arm statutes, Constitution | Retrieval |
| `course/study-aids/` | Review-session transcripts | Retrieval |
| `graded-answers/` | **Empty: bring your own.** Graded final-exam answers used as band anchors | Blind evaluation only |

Not included: graded student final-exam answers and student class notes.

Add a new exam by dropping in `<year>-final.md` and `<year>-greiner-civpro2-model-answer.md`.
Add a variant by dropping in `<year>-<slug>-final.md` and `<year>-<slug>-model-answer.md`.
It shows up in `npm run exams` with no code change. Course materials remain the property of
their authors and are shared for study use; the MIT license covers the code.
