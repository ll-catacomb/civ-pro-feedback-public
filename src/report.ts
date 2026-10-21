import fs from "node:fs";

import { isStudentExemplarSource } from "./course-source-label";
import type { RunState } from "./run-state";
import type {
  CalibrationAnalysis,
  Evaluation,
  Feedback,
  JudgeResult,
  RetrievedSource,
  StageTrace,
  SubmissionFitJudge,
} from "./types";

type Card = { questionRef?: string; crossCutting?: boolean };

function groupKey(card: Card): string {
  if (card.crossCutting) return "Across the exam";
  return card.questionRef?.trim() || "General";
}

function quote(text: string | undefined): string {
  return text?.trim() ? `> ${text.trim().replace(/\n/g, "\n> ")}\n\n` : "";
}

/** The student-facing feedback, grouped by exam question in exam order. */
export function renderFeedback(feedback: Feedback, sources: RetrievedSource[]): string {
  const groups: string[] = [];
  const seen = new Set<string>();
  for (const card of [...feedback.strengths, ...feedback.improvements]) {
    const key = groupKey(card);
    if (!seen.has(key)) { seen.add(key); groups.push(key); }
  }
  groups.sort((a, b) => Number(a === "Across the exam") - Number(b === "Across the exam"));

  const citable = new Map(sources.filter((source) => !isStudentExemplarSource(source)).map((source) => [source.id, source]));
  const cited = new Set<string>();
  const cite = (ids: string[]) => {
    const kept = ids.filter((id) => citable.has(id));
    kept.forEach((id) => cited.add(id));
    return kept.length ? `\n\n*Sources: ${kept.map((id) => `\`${id}\``).join(", ")}*` : "";
  };

  const out: string[] = [`# ${feedback.headline}`, "", feedback.overview, ""];
  for (const group of groups) {
    out.push(`## ${group}`, "");
    for (const strength of feedback.strengths.filter((card) => groupKey(card) === group)) {
      out.push(`### ✓ ${strength.label}`, "", quote(strength.answerExcerpt) + strength.detail + cite(strength.sourceIds), "");
    }
    for (const improvement of feedback.improvements.filter((card) => groupKey(card) === group)) {
      out.push(
        `### → ${improvement.label} *(${improvement.priority} priority)*`,
        "",
        `${quote(improvement.answerExcerpt)}**What happened.** ${improvement.whatHappened}`,
        "",
        `**Why it matters.** ${improvement.whyItMatters}`,
        "",
        `**How to improve.** ${improvement.howToImprove}${cite(improvement.sourceIds)}`,
        "",
      );
      if (feedback.exampleRevision && feedback.exampleRevisionTarget === improvement.label) {
        out.push("**Example revision**", "", quote(feedback.exampleRevision));
      }
    }
  }
  const attached = feedback.improvements.some((card) => card.label === feedback.exampleRevisionTarget);
  if (feedback.exampleRevision && !attached) out.push("## Example revision", "", quote(feedback.exampleRevision));
  if (feedback.revisionPlan.length) {
    out.push("## Revision plan", "", ...feedback.revisionPlan.map((step, index) => `${index + 1}. ${step}`), "");
  }
  out.push(feedback.closing, "");
  if (cited.size) {
    out.push("---", "", "### Course sources cited", "");
    for (const id of cited) {
      const source = citable.get(id)!;
      out.push(`- \`${id}\` — ${source.title} (${source.path})`);
    }
    out.push("");
  }
  return out.join("\n");
}

/** Staff/QA view: the band, criterion scores, judge findings, retrieval, cost. */
export function renderAudit(state: RunState): string {
  const evaluation = state.read<Evaluation>("blind_evaluation");
  const judge = state.read<JudgeResult>("judge_and_revise");
  const gate = state.read<SubmissionFitJudge>("submission_fit_judge");
  const calibration = state.read<CalibrationAnalysis>("calibration_analysis");
  const traces: StageTrace[] = fs.existsSync(state.file("traces.json"))
    ? JSON.parse(fs.readFileSync(state.file("traces.json"), "utf8"))
    : [];
  const out: string[] = [
    `# Audit — ${state.exam.title}`,
    "",
    `Prompt version \`${state.input.promptVersion}\` · ${state.input.scope}${state.input.questionRef ? ` (${state.input.questionRef})` : ""} · ${state.input.mode}`,
    "",
    "*Internal record. The band is never shown to students: it exists so a human can check the chain against a known grade.*",
    "",
  ];
  if (gate) out.push("## Intake gate", "", `${gate.status} · ${gate.recommendation} · confidence ${gate.confidence}`, "", gate.rationale, "");
  if (state.isZeroCredit()) out.push("**Zero credit — both intake passes found the answer nonresponsive. The chain stopped here.**", "");
  if (evaluation) {
    out.push(
      "## Band",
      "",
      `**${evaluation.provisionalBand}${evaluation.bandLean && evaluation.bandLean !== "solid" ? ` (lean ${evaluation.bandLean})` : ""}** · confidence ${evaluation.confidence}`,
      "",
      evaluation.bandRationale,
      "",
      `*Why not higher:* ${evaluation.whyNotHigher}`,
      "",
      `*Why not lower:* ${evaluation.whyNotLower}`,
      "",
      "## Criteria",
      "",
      "| Criterion | Coverage | Error type | Finding |",
      "|---|---|---|---|",
      ...evaluation.criteria.map((criterion) => `| ${criterion.criterionId} | ${criterion.coverage}/4 | ${criterion.errorType} | ${criterion.finding.replace(/\|/g, "\\|").replace(/\n/g, " ")} |`),
      "",
    );
  }
  if (judge) {
    out.push("## Judge", "", `approved: ${judge.approved} · quality ${judge.qualityScore}/100`, "");
    for (const finding of judge.findings) out.push(`- **${finding.severity}** — ${finding.problem} → ${finding.correction}`);
    out.push("");
  }
  if (calibration) {
    out.push("## Calibration analysis", "", `Actual ${state.input.actualGrade} · ${calibration.gradeAgreement}`, "", calibration.summary, "");
    for (const rec of calibration.promptRecommendations) out.push(`- **${rec.targetStage}**: ${rec.problem} → ${rec.proposedChange}`);
    out.push("");
  }
  const skipped = ["retrieval_query", "retrieval_rerank"].filter((stage) => state.skipped(stage));
  out.push("## Retrieval", "", skipped.length ? `lexical_fallback (skipped: ${skipped.join(", ")})` : "expanded_lexical", "");
  if (traces.length) {
    out.push("## Stages", "", "| Stage | Model | Effort | Seconds | In tokens | Out tokens |", "|---|---|---|---|---|---|");
    for (const trace of traces) {
      out.push(`| ${trace.name} | ${trace.model} | ${trace.reasoningEffort} | ${(trace.durationMs / 1000).toFixed(0)} | ${trace.inputTokens ?? ""} | ${trace.outputTokens ?? ""} |`);
    }
    out.push("");
  }
  return out.join("\n");
}

export function writeReports(state: RunState): string[] {
  const written: string[] = [];
  const judge = state.read<JudgeResult>("judge_and_revise");
  if (judge) {
    const sources = (() => { try { return state.sources(); } catch { return []; } })();
    fs.writeFileSync(state.file("feedback.md"), renderFeedback(judge.feedback, sources));
    written.push(state.file("feedback.md"));
  } else if (state.isZeroCredit()) {
    const gate = state.require<SubmissionFitJudge>("submission_fit_judge");
    fs.writeFileSync(state.file("feedback.md"), `# This answer does not respond to the selected exam\n\n${gate.rationale}\n\nIf you picked the wrong exam, start a new run with the right --exam.\n`);
    written.push(state.file("feedback.md"));
  }
  fs.writeFileSync(state.file("audit.md"), renderAudit(state));
  written.push(state.file("audit.md"));
  return written;
}
