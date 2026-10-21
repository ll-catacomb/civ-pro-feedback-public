# The student-feedback prompt chain

Prompt version `civpro-feedback-v4.26.0` · source of truth: `src/stages.ts` (wiring), `src/prompts.ts` (text), `src/types.ts` (schemas)

Model tiers (set in `.env`): **fast** and **work** default to `claude-sonnet-5`; **evaluator** and **judge** default to `claude-opus-5-5`. Every call uses adaptive thinking at the stated effort.

Every box below is one model call made through `runStage()` in `src/chain.ts`. Each call is a
structured-output call: a developer/system prompt, one user message, and a Zod schema the
model must fill. No stage sees a later stage's output, and no stage sees the student's real
grade.

---

## 1. The live chain, end to end

```mermaid
flowchart TD
    START([Student submits answer + selects exam]) --> FIT

    subgraph INTAKE["Intake gate — runFeedbackIntake"]
        FIT["<b>1. submission_fit</b><br/>Does this answer respond to<br/>the selected exam at all?<br/><i>fast tier · effort high</i>"]
        LOCAL["<b>exam-match</b> (local, no model)<br/>lexical rank of the answer<br/>against every exam prompt"]
        FITJ["<b>2. submission_fit_judge</b><br/>Independent conservative<br/>re-check of the gate<br/><i>judge tier · effort high</i>"]
        FIT --> FITJ
        LOCAL -. advisory signal .-> FITJ
    end

    FITJ --> GATE{"Both passes agree:<br/>nonresponsive + zero_credit<br/>+ confidence ≥ 0.9?"}
    GATE -- yes --> ZERO(["<b>Zero credit, chain stops</b><br/>no issue map, no feedback"])
    GATE -- no --> MAP

    MAP["<b>3. issue_map</b><br/>Point-aware rubric built from the<br/>exam + instructor model answer.<br/>Preserves the exam's own point values.<br/><i>work tier · effort medium</i>"]

    MAP --> RQ

    subgraph RETRIEVAL["Evidence assembly"]
        RQ["<b>4. retrieval_query</b><br/>Expand each criterion into the<br/>keywords the course materials<br/>actually use<br/><i>fast tier · effort low · non-fatal</i>"]
        BM25["<b>BM25 search</b> (local, no model)<br/>over content/course/**.md<br/>→ 48 candidate chunks"]
        RR["<b>5. retrieval_rerank</b><br/>Pick the ≤24 excerpts that<br/>actually support the issue map<br/><i>fast tier · effort low · non-fatal</i>"]
        RQ --> BM25 --> RR
    end

    RR --> EVAL
    ANCH["<b>anchor pack</b> (local, no model)<br/>graded reference answers,<br/>one per band DS/H/P/LP,<br/>this answer's own fixture excluded"] --> EVAL

    EVAL["<b>6. blind_evaluation</b><br/>Score every criterion 0–4, record defects,<br/>and pick the band by pairwise comparison<br/>against the graded anchors.<br/>Emits provisionalBand + bandLean.<br/><i>evaluator tier · effort high</i>"]

    EVAL --> DRAFT

    DRAFT["<b>7. feedback_draft</b> — the coach<br/>Turn the evaluation into student-facing<br/>feedback, organized by exam question,<br/>every addition paired with a cut.<br/><i>work tier · effort medium</i>"]

    DRAFT --> JUDGE

    JUDGE["<b>8. judge_and_revise</b><br/>Skeptical final pass. Verifies claims against<br/>the answer and sources, enforces the drafting<br/>rules, returns corrected feedback + findings.<br/><i>judge tier · effort high</i>"]

    JUDGE --> OUT(["<b>FeedbackRun</b><br/>judge.feedback → student<br/>predictedGrade, traces, sources → audit"])

    classDef model fill:#eef4ff,stroke:#4569b4,stroke-width:1px,color:#111;
    classDef local fill:#f3f3f0,stroke:#999,stroke-dasharray:3 3,color:#111;
    classDef stop fill:#fdeaea,stroke:#c8102e,color:#111;
    class FIT,FITJ,MAP,RQ,RR,EVAL,DRAFT,JUDGE model;
    class LOCAL,BM25,ANCH local;
    class ZERO stop;
```

---

## 2. What each stage is given and what it returns

| # | Stage | Developer prompt | User-message inputs | Schema out | Model · effort |
|---|-------|------------------|---------------------|-----------|----------------|
| 1 | `submission_fit` | `submissionFitDeveloperPrompt` | exam prompt, student answer | `SubmissionFitAssessmentSchema` | fast · high |
| 2 | `submission_fit_judge` | `submissionFitJudgeDeveloperPrompt` | exam, answer, first-pass result, local exam-match ranking | `SubmissionFitJudgeSchema` | judge · high |
| 3 | `issue_map` | `rubricDeveloperPrompt` | exam, instructor model answer | `IssueMapSchema` | work · medium |
| 4 | `retrieval_query` | `queryExpansionDeveloperPrompt` | issue map, answer | `RetrievalQuerySchema` | fast · low |
| 5 | `retrieval_rerank` | `sourceRerankDeveloperPrompt` | issue map, answer, 48 BM25 candidates | `SourceRerankSchema` | fast · low |
| 6 | `blind_evaluation` | `evaluationDeveloperPrompt` | exam, model answer, issue map, answer, **anchor pack**, ≤24 sources | `EvaluationSchema` | evaluator · high |
| 7 | `feedback_draft` | `coachDeveloperPrompt` | answer, issue map, evaluation, sources | `FeedbackSchema` | work · medium |
| 8 | `judge_and_revise` | `judgeDeveloperPrompt` | exam, model answer, answer, issue map, evaluation, **draft feedback**, sources | `JudgeSchema` | judge · high |

Note what stage 7 does *not* receive: the exam prompt, the model answer, and the anchors.
The coach works from the evaluation's findings, so the band comparison cannot leak into the
student-facing prose. Stage 8 gets everything back so it can check the coach against the record.

---

## 3. Shared prompt blocks — who gets what

The instructor-supplied material lives in `src/prompts.ts` as named constants that are
interpolated into several developer prompts. This is the injection matrix:

```mermaid
flowchart LR
    subgraph BLOCKS["Instructor-supplied blocks"]
        SP["SHARED_POLICY<br/><i>closed source set, citation<br/>discipline, no grader names</i>"]
        LC["LAW_CHANGES<br/><i>Iqbal, §1391, Exxon,<br/>Atlas Roofing, Reeves</i>"]
        GR["GREINERISMS<br/><i>happy court, incorporeal,<br/>imaginary lawsuit; RJ→claim<br/>preclusion, JNOV→JAMOL</i>"]
        AB["ABBREVIATIONS<br/><i>SMJ, NMOCE, JAMOL,<br/>CNOF, A2J …</i>"]
        CF["COURSE_FORMULATIONS<br/><i>REA/Sibbach, numerosity,<br/>plausibility sequence</i>"]
        CC["COURSE_CLARIFICATIONS<br/><i>Rule 50 posture, rule-statement<br/>forms, Erie is not brain-off</i>"]
        BO["BRAIN_OFF_TOPICS"]
        GM["GRADER_META_FEEDBACK"]
    end

    LC --> SP

    SP --> S3["3. issue_map"]
    SP --> S6["6. blind_evaluation"]
    SP --> S7["7. feedback_draft"]
    SP --> S8["8. judge_and_revise"]

    GR --> S6 & S7 & S8
    AB --> S6 & S7 & S8
    CF --> S6 & S7
    CC --> S6 & S7
    BO --> S7
    GM --> S7
```

Stages 1, 2, 4 and 5 carry none of it — the gate and the retrieval stages have no business
grading, so they are kept deliberately thin.

---

## 4. Retrieval, in detail

```mermaid
flowchart TD
    IM[issue map] --> Q
    ANS[student answer] --> Q
    Q["<b>retrieval_query</b><br/>criterion-by-criterion search terms:<br/>doctrine names, case names,<br/>bare statute numbers"] --> TERMS

    TERMS["weighted query terms<br/>issue map ×1.0<br/>expansion ×0.8<br/>answer ×0.5"] --> BM

    CORPUS[("content/course/**.md<br/>outlines, case notes,<br/>exams, model answers")] --> BM

    BM["<b>Okapi BM25</b><br/>k1 1.5 · b 0.75<br/>title terms ×3<br/>max 2 chunks per document"] --> C48

    C48["48 candidates"] --> RRK["<b>retrieval_rerank</b><br/>relevance 1–4 + reason<br/>per selected source"]
    RRK --> FINAL["≤24 sources, reranked first,<br/>unselected candidates backfill"]
    C48 -.->|rerank fails| FINAL

    FINAL --> USE["used by stages 6, 7, 8<br/>source IDs must be cited exactly"]
```

There is no embeddings endpoint in the Claude API, so the "semantic" half of retrieval is
stage 4: Claude names the vocabulary the course materials would use, and BM25 matches it
lexically. If stage 4 or 5 fails, the run continues on raw BM25 order rather than aborting.

---

## 5. The calibration loop (optional)

Only meaningful when you know an answer's real band. The blind chain runs first; only then
is the actual band revealed to a separate analyst stage.

```mermaid
flowchart LR
    FIX[("your graded answer<br/>content/graded-answers/2019-h.md")] --> RUN["civpro run --exclude 2019-h<br/>(its own grade never anchors it)"]
    RUN --> PRED["predicted band + feedback"]
    FIX -->|"--actual H, revealed only now"| CAL
    PRED --> CAL["<b>calibration_analysis</b><br/>judge tier · effort medium"]
    CAL --> OUT["exact / adjacent / material_miss<br/>+ prompt-change recommendations<br/>tied to a named stage"]
    OUT --> LOG["docs/prompt-feedback-log.md<br/>→ bump PROMPT_VERSION"]
```

## 6. Reliability behavior

- Streamed calls, `max_tokens` 32000, adaptive thinking, per-stage effort.
- The SDK retries 429/5xx itself; each stage then retries once more after 5s + jitter.
- 400/401/403/404 and refusals are not retried.
- `retrieval_query` and `retrieval_rerank` are optional: if they fail the run continues on plain
  BM25 order and is labeled `lexical_fallback` in `audit.md`.
- Every stage's output is a JSON file in the run folder, so an interrupted run resumes where it stopped
  (`civpro run --out <folder>`).
