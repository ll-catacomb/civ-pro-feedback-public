import fs from "node:fs";
import path from "node:path";

import { NonRetryableError, outputContract, type Provider } from "./providers";
import type { RunState } from "./run-state";
import { STAGES, type StageDefinition } from "./stages";
import type { StageTrace } from "./types";

// Retry transient failures once at the stage boundary (the SDK already retries
// 429/5xx internally). Jitter keeps parallel runs from retrying together.
const STAGE_RETRY_DELAYS_MS = [5_000];
const STAGE_RETRY_JITTER_MS = 5_000;

/** Parse a model's text into the stage schema, tolerating one Markdown fence. */
export function parseStageOutput(stage: StageDefinition, text: string): unknown {
  if (!text.trim()) throw new Error("The response contained no output text.");
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    const fenced = text.trim().match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    if (!fenced) throw new Error("The model response was not valid JSON.");
    json = JSON.parse(fenced[1]);
  }
  return stage.schema.parse(json);
}

/**
 * What runs next, given what is on disk. `null` means the chain is finished;
 * "zero_credit" means both intake passes confidently found the answer
 * nonresponsive and the chain stops without grading.
 */
export function nextStage(state: RunState): StageDefinition | "zero_credit" | null {
  for (const stage of STAGES) {
    if (stage.name === "issue_map" && state.isZeroCredit()) return "zero_credit";
    if (!state.has(stage.name) && !state.skipped(stage.name)) return stage;
  }
  return null;
}

/** Local work a stage depends on (BM25 retrieval before the rerank). */
export async function prepareStage(state: RunState, stage: StageDefinition): Promise<void> {
  if (stage.name === "retrieval_rerank") {
    const candidates = await state.prepareCandidates();
    if (candidates.length === 0) state.markSkipped("retrieval_rerank", "BM25 returned no candidates.");
  }
  if (["blind_evaluation", "feedback_draft", "judge_and_revise"].includes(stage.name)) {
    await state.prepareCandidates();
    state.sources();
  }
}

function appendTrace(state: RunState, trace: StageTrace): void {
  const filePath = state.file("traces.json");
  const traces: StageTrace[] = fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, "utf8")) : [];
  traces.push(trace);
  fs.writeFileSync(filePath, `${JSON.stringify(traces, null, 2)}\n`);
}

export async function runStage(state: RunState, stage: StageDefinition, provider: Provider): Promise<unknown> {
  await prepareStage(state, stage);
  if (state.skipped(stage.name)) return undefined;
  const model = provider.models[stage.tier];
  const system = stage.system;
  const user = stage.user(state);
  let lastError: unknown;
  for (let attempt = 0; attempt <= STAGE_RETRY_DELAYS_MS.length; attempt += 1) {
    const startedAt = Date.now();
    try {
      const result = await provider.call({ model, effort: stage.effort, system, user, schema: stage.schema });
      const value = parseStageOutput(stage, result.text);
      state.write(stage.name, value);
      appendTrace(state, {
        name: stage.name,
        model: result.model,
        reasoningEffort: stage.effort,
        durationMs: Date.now() - startedAt,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        responseId: result.responseId,
      });
      return value;
    } catch (error) {
      lastError = error;
      if (error instanceof NonRetryableError) break;
      if (attempt < STAGE_RETRY_DELAYS_MS.length) {
        const delay = STAGE_RETRY_DELAYS_MS[attempt] + Math.floor(Math.random() * STAGE_RETRY_JITTER_MS);
        console.warn(`  ${stage.name} failed (${error instanceof Error ? error.message.slice(0, 160) : error}); retrying in ${Math.round(delay / 1000)}s`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  const message = lastError instanceof Error ? lastError.message : String(lastError);
  if (stage.optional) {
    // Retrieval degrades to plain BM25 on issue-map and answer terms instead of
    // aborting the run; the skip file records why.
    console.warn(`  ${stage.name} failed and is optional; continuing without it. ${message}`);
    state.markSkipped(stage.name, message);
    return undefined;
  }
  throw new Error(`The ${stage.name} stage failed: ${message}`);
}

export async function runChain(
  state: RunState,
  provider: Provider,
  onStage: (stage: StageDefinition, model: string) => void = () => {},
): Promise<"complete" | "zero_credit"> {
  for (;;) {
    const stage = nextStage(state);
    if (stage === null) return "complete";
    if (stage === "zero_credit") return "zero_credit";
    onStage(stage, provider.models[stage.tier]);
    await runStage(state, stage, provider);
  }
}

/**
 * Harness mode: write the exact system + user prompt a stage would send, so an
 * agent (Claude Code, Codex, …) can act as the model for that stage. The output
 * contract is appended because no API is enforcing the schema here.
 */
export async function renderStagePrompt(state: RunState, stage: StageDefinition): Promise<string> {
  await prepareStage(state, stage);
  if (state.skipped(stage.name)) {
    return `Stage ${stage.name} was skipped: ${fs.readFileSync(state.file(`${stage.name}.skipped`), "utf8").trim()}`;
  }
  const promptDir = state.file("prompts");
  fs.mkdirSync(promptDir, { recursive: true });
  const filePath = path.join(promptDir, `${stage.name}.md`);
  const body = [
    `<!-- civpro stage: ${stage.name} · suggested model tier: ${stage.tier} · effort: ${stage.effort} -->`,
    `<!-- Act as the model for this one stage. Read nothing else. Write ONLY the JSON value to ${path.relative(process.cwd(), state.file(`${stage.name}.draft.json`))} -->`,
    "",
    "# SYSTEM PROMPT",
    "",
    `${stage.system}${outputContract(stage.schema)}`,
    "",
    "# USER MESSAGE",
    "",
    stage.user(state),
    "",
  ].join("\n");
  fs.writeFileSync(filePath, body);
  return filePath;
}
