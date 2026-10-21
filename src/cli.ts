import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

import { listGradedAnswers } from "./anchors";
import { nextStage, parseStageOutput, prepareStage, renderStagePrompt, runChain, runStage } from "./chain";
import { getExams, listIncompleteExams } from "./exams";
import { ROOT } from "./paths";
import { PROMPT_VERSION } from "./prompts";
import { createProvider, stageJsonSchema } from "./providers";
import { writeReports } from "./report";
import { RunState } from "./run-state";
import { ALL_STAGES, CALIBRATION_STAGE, getStage } from "./stages";
import { GradeBandSchema, SubmissionModeSchema, SubmissionScopeSchema } from "./types";

try {
  process.loadEnvFile(path.join(ROOT, ".env"));
} catch {
  // No .env — fine for harness mode, and the SDK also reads the environment.
}

const HELP = `civpro — Civil Procedure practice-exam feedback chain (${PROMPT_VERSION})

Run the whole chain against an API (needs ANTHROPIC_API_KEY, or see .env.example):
  npm run civpro -- run --exam 2019-final --answer my-answer.md
      [--scope single_question --question "Question 2"] [--mode bullet_points]
      [--out runs/my-run]          resume an interrupted run by passing its folder

Drive the chain yourself, one stage at a time (Claude Code / Codex / any harness):
  npm run civpro -- new --exam 2019-final --answer my-answer.md   → creates runs/<id>
  npm run civpro -- render --run runs/<id>    write the next stage's prompt to runs/<id>/prompts/
  npm run civpro -- check  --run runs/<id>    validate runs/<id>/<stage>.draft.json and say what's next
  npm run civpro -- skip   --run runs/<id>    skip an optional retrieval stage
  npm run civpro -- report --run runs/<id>    write feedback.md and audit.md

Other:
  npm run civpro -- exams                     list every practicable exam and assignment
  npm run civpro -- calibrate --run runs/<id> --actual H [--comments notes.md] [--render]
  npm run civpro -- prompts                   regenerate prompts/ (the readable prompt export)
`;

function fail(message: string): never {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

function rel(filePath: string): string {
  return path.relative(process.cwd(), filePath) || ".";
}

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    exam: { type: "string" },
    answer: { type: "string" },
    scope: { type: "string" },
    question: { type: "string" },
    mode: { type: "string" },
    out: { type: "string" },
    run: { type: "string" },
    stage: { type: "string" },
    actual: { type: "string" },
    comments: { type: "string" },
    exclude: { type: "string" },
    render: { type: "boolean" },
    json: { type: "boolean" },
    help: { type: "boolean", short: "h" },
  },
});

const command = positionals[0];

function createRun(): RunState {
  if (!values.exam) fail("--exam is required. List them with `npm run civpro -- exams`.");
  if (!values.answer) fail("--answer is required: a .md or .txt file containing the answer.");
  const answerPath = path.resolve(values.answer);
  if (!fs.existsSync(answerPath)) fail(`No such file: ${values.answer}`);
  const scope = SubmissionScopeSchema.parse(values.scope ?? (values.question ? "single_question" : "full_exam"));
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15);
  const dir = path.resolve(values.out ?? path.join(ROOT, "runs", `${stamp}-${values.exam}`));
  return RunState.create(dir, {
    examId: values.exam,
    scope,
    mode: SubmissionModeSchema.parse(values.mode ?? "full_draft"),
    questionRef: values.question,
    excludeGradedAnswer: values.exclude,
  }, fs.readFileSync(answerPath, "utf8"));
}

function openRun(): RunState {
  if (!values.run) fail("--run <folder> is required.");
  return new RunState(path.resolve(values.run));
}

function describeNext(state: RunState): void {
  const next = nextStage(state);
  if (next === null) {
    const written = writeReports(state);
    console.log(`\n✓ Chain complete. ${written.map(rel).join(" and ")} written.`);
  } else if (next === "zero_credit") {
    writeReports(state);
    console.log("\n■ Both intake passes found the answer nonresponsive to this exam. The chain stops here (zero credit).");
  } else {
    console.log(`\nNext stage: ${next.name} — ${next.purpose}${next.optional ? " (optional)" : ""}`);
  }
}

async function main() {
  if (!command || values.help) {
    console.log(HELP);
    return;
  }

  switch (command) {
    case "exams": {
      const exams = getExams();
      if (values.json) {
        console.log(JSON.stringify(exams.map(({ id, kind, title, shortDescription }) => ({ id, kind, title, shortDescription })), null, 2));
        return;
      }
      for (const exam of exams) console.log(`${exam.id.padEnd(24)} ${exam.shortDescription}`);
      const incomplete = listIncompleteExams();
      if (incomplete.length) console.log(`\nNot practicable (missing a paired file): ${incomplete.map((entry) => entry.year).join(", ")}`);
      const graded = listGradedAnswers();
      console.log(`\nGraded reference answers installed: ${graded.length ? graded.map((answer) => answer.id).join(", ") : "none (see content/graded-answers/README.md)"}`);
      return;
    }

    case "new": {
      const state = createRun();
      console.log(`Created ${rel(state.dir)} for ${state.exam.title}`);
      describeNext(state);
      return;
    }

    case "run": {
      const resuming = values.out && fs.existsSync(path.join(path.resolve(values.out), "input.json"));
      const state = resuming ? new RunState(path.resolve(values.out!)) : createRun();
      const provider = createProvider();
      console.log(`${resuming ? "Resuming" : "Running"} ${state.exam.title} → ${rel(state.dir)} (${provider.name})`);
      const outcome = await runChain(state, provider, (stage, model) => {
        console.log(`  · ${stage.name.padEnd(22)} ${model} · ${stage.effort}`);
      });
      const written = writeReports(state);
      console.log(outcome === "zero_credit"
        ? "\n■ Zero credit: the answer does not respond to this exam."
        : `\n✓ Done. Read ${rel(state.file("feedback.md"))}`);
      console.log(`  Also written: ${written.filter((file) => !file.endsWith("feedback.md")).map(rel).join(", ")}`);
      return;
    }

    case "render": {
      const state = openRun();
      const named = values.stage ?? positionals[1];
      const stage = named ? getStage(named) : nextStage(state);
      if (stage === null || stage === "zero_credit") { describeNext(state); return; }
      const result = await renderStagePrompt(state, stage);
      if (result.startsWith("Stage ")) { console.log(result); describeNext(state); return; }
      console.log(`Prompt for ${stage.name} → ${rel(result)}`);
      console.log(`Write the JSON output to ${rel(state.file(`${stage.name}.draft.json`))}, then run \`npm run civpro -- check --run ${rel(state.dir)}\`.`);
      return;
    }

    case "check": {
      const state = openRun();
      const named = values.stage ?? positionals[1];
      const pending = nextStage(state);
      const stage = named ? getStage(named) : (pending && pending !== "zero_credit" ? pending : null);
      if (!stage) { describeNext(state); return; }
      const draftPath = state.file(`${stage.name}.draft.json`);
      if (!fs.existsSync(draftPath)) fail(`${rel(draftPath)} does not exist yet. Render the prompt, then write the stage's JSON there.`);
      try {
        const value = parseStageOutput(stage, fs.readFileSync(draftPath, "utf8"));
        state.write(stage.name, value);
        fs.rmSync(draftPath);
      } catch (error) {
        fail(`${stage.name} output failed validation. Fix ${rel(draftPath)} and run check again:\n${error instanceof Error ? error.message : error}`);
      }
      console.log(`✓ ${stage.name} validated.`);
      if (stage.name === "retrieval_rerank") console.log(`  Final evidence packet: ${rel(state.file("sources.json"))} (${state.sources().length} excerpts)`);
      describeNext(state);
      return;
    }

    case "skip": {
      const state = openRun();
      const next = nextStage(state);
      if (!next || next === "zero_credit" || !next.optional) fail("Only the optional retrieval stages can be skipped.");
      state.markSkipped(next.name, "Skipped by hand.");
      console.log(`Skipped ${next.name}.`);
      describeNext(state);
      return;
    }

    case "retrieve": {
      const state = openRun();
      const candidates = await state.prepareCandidates();
      console.log(`${candidates.length} BM25 candidates → ${rel(state.file("candidates.json"))}`);
      return;
    }

    case "report": {
      const state = openRun();
      describeNext(state);
      return;
    }

    case "calibrate": {
      const state = openRun();
      if (!values.actual) fail("--actual DS|H|P|LP is required.");
      const input = {
        ...state.input,
        actualGrade: GradeBandSchema.parse(values.actual.toUpperCase()),
        ...(values.comments ? { graderComments: fs.readFileSync(path.resolve(values.comments), "utf8") } : {}),
      };
      fs.writeFileSync(state.file("input.json"), `${JSON.stringify(input, null, 2)}\n`);
      const calibrating = new RunState(state.dir);
      if (values.render) {
        const file = await renderStagePrompt(calibrating, CALIBRATION_STAGE);
        console.log(`Prompt → ${rel(file)}. Write ${rel(calibrating.file("calibration_analysis.draft.json"))}, then \`npm run civpro -- check calibration_analysis --run ${rel(state.dir)}\`.`);
        return;
      }
      await prepareStage(calibrating, CALIBRATION_STAGE);
      await runStage(calibrating, CALIBRATION_STAGE, createProvider());
      writeReports(calibrating);
      console.log(`✓ Calibration analysis written to ${rel(calibrating.file("audit.md"))}`);
      return;
    }

    case "prompts": {
      const outDir = path.join(ROOT, "prompts");
      fs.rmSync(outDir, { recursive: true, force: true });
      fs.mkdirSync(outDir, { recursive: true });
      const index: string[] = [
        "# Prompts",
        "",
        `Generated from \`src/prompts.ts\` by \`npm run civpro -- prompts\` — prompt version \`${PROMPT_VERSION}\`. Edit the TypeScript, not these files.`,
        "",
        "| # | Stage | Tier | Effort | Purpose |",
        "|---|---|---|---|---|",
      ];
      ALL_STAGES.forEach((stage, index_) => {
        const number = String(index_ + 1).padStart(2, "0");
        const file = `${number}-${stage.name}.md`;
        fs.writeFileSync(path.join(outDir, file), [
          `# ${number} · ${stage.name}`,
          "",
          `${stage.purpose}`,
          "",
          `Model tier **${stage.tier}** · effort **${stage.effort}**${stage.optional ? " · optional (failure degrades to plain BM25)" : ""}`,
          "",
          "## System prompt",
          "",
          "````text",
          stage.system,
          "````",
          "",
          "## Output schema",
          "",
          "```json",
          JSON.stringify(stageJsonSchema(stage.schema), null, 2),
          "```",
          "",
        ].join("\n"));
        index.push(`| ${number} | [${stage.name}](${file}) | ${stage.tier} | ${stage.effort} | ${stage.purpose} |`);
      });
      fs.writeFileSync(path.join(outDir, "README.md"), `${index.join("\n")}\n\nThe user message each stage receives is built in \`src/stages.ts\`; render a real one with \`npm run civpro -- render\`.\n`);
      console.log(`Wrote ${ALL_STAGES.length} stage prompts to ${rel(outDir)}/`);
      return;
    }

    default:
      fail(`Unknown command "${command}".\n\n${HELP}`);
  }
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error)));

