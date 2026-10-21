import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";

import type { Effort, ModelTier } from "./stages";

const MAX_OUTPUT_TOKENS = 32_000;

export type StageCall = {
  model: string;
  effort: Effort;
  system: string;
  user: string;
  schema: z.ZodType<unknown>;
};

export type StageResult = {
  text: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  responseId?: string;
};

export type Provider = {
  name: string;
  models: Record<ModelTier, string>;
  call: (input: StageCall) => Promise<StageResult>;
};

/** Raised for failures that retrying the same request cannot clear. */
export class NonRetryableError extends Error {}

/** JSON Schema for a stage, narrowed to the subset structured outputs accept. */
export function stageJsonSchema(schema: z.ZodType<unknown>): Record<string, unknown> {
  return zodOutputFormat(schema).schema as Record<string, unknown>;
}

/** Appended to the system prompt when the provider cannot enforce the schema natively. */
export function outputContract(schema: z.ZodType<unknown>): string {
  return `\n\n# Output contract\nReturn only one valid JSON value. Do not use Markdown fences or add commentary. The value must satisfy this JSON Schema:\n${JSON.stringify(stageJsonSchema(schema))}`;
}

function tiers(prefix: string, defaults: { fast?: string; evaluator?: string }): Record<ModelTier, string> {
  const env = process.env;
  const fast = env.CIVPRO_FAST_MODEL ?? env[`${prefix}_MODEL`] ?? defaults.fast;
  const evaluator = env.CIVPRO_EVALUATOR_MODEL ?? env[`${prefix}_MODEL`] ?? defaults.evaluator ?? fast;
  if (!fast || !evaluator) {
    throw new Error(`Set ${prefix}_MODEL (or CIVPRO_FAST_MODEL and CIVPRO_EVALUATOR_MODEL) in .env to choose models for this provider.`);
  }
  return {
    fast,
    work: env.CIVPRO_WORK_MODEL ?? fast,
    evaluator,
    judge: env.CIVPRO_JUDGE_MODEL ?? evaluator,
  };
}

/**
 * Anthropic API (default). Same request shape the hosted app sends: adaptive
 * thinking, per-stage effort, native JSON-schema structured output, streamed so
 * long evaluations cannot hit an HTTP timeout.
 */
function anthropicProvider(): Provider {
  const client = new Anthropic();
  const native = process.env.CIVPRO_STRUCTURED_OUTPUT !== "prompt";
  return {
    name: "anthropic",
    models: tiers("ANTHROPIC", { fast: "claude-sonnet-5", evaluator: "claude-opus-5-5" }),
    async call(input) {
      let message: Anthropic.Message;
      try {
        const stream = client.messages.stream({
          model: input.model,
          max_tokens: MAX_OUTPUT_TOKENS,
          thinking: { type: "adaptive" },
          output_config: {
            effort: input.effort,
            ...(native ? { format: zodOutputFormat(input.schema) } : {}),
          },
          system: native ? input.system : `${input.system}${outputContract(input.schema)}`,
          messages: [{ role: "user", content: input.user }],
        });
        message = await stream.finalMessage();
      } catch (error) {
        if (error instanceof Anthropic.BadRequestError
          || error instanceof Anthropic.AuthenticationError
          || error instanceof Anthropic.PermissionDeniedError
          || error instanceof Anthropic.NotFoundError) {
          throw new NonRetryableError(error.message);
        }
        throw error;
      }
      if (message.stop_reason === "max_tokens") {
        throw new Error("Output truncated at max_tokens before the structured object completed.");
      }
      if (message.stop_reason === "refusal") {
        throw new NonRetryableError("The model declined this request (refusal stop reason). Review the submission manually.");
      }
      return {
        text: message.content.flatMap((block) => block.type === "text" ? [block.text] : []).join(""),
        model: message.model,
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
        responseId: message.id,
      };
    },
  };
}

/**
 * Any OpenAI-compatible Chat Completions endpoint: OpenAI itself, OpenRouter,
 * a local server, etc. Set OPENAI_BASE_URL and OPENAI_MODEL. The schema is sent
 * as a non-strict json_schema response format and also spelled out in the
 * system prompt; Zod validates the result either way.
 */
function openAICompatibleProvider(): Provider {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("CIVPRO_PROVIDER=openai needs OPENAI_API_KEY.");
  const baseUrl = (process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/+$/, "");
  const sendEffort = process.env.OPENAI_REASONING_EFFORT !== "off";
  return {
    name: "openai-compatible",
    models: tiers("OPENAI", {}),
    async call(input) {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: input.model,
          messages: [
            { role: "system", content: `${input.system}${outputContract(input.schema)}` },
            { role: "user", content: input.user },
          ],
          response_format: {
            type: "json_schema",
            json_schema: { name: "stage_output", strict: false, schema: stageJsonSchema(input.schema) },
          },
          ...(sendEffort ? { reasoning_effort: input.effort === "xhigh" ? "high" : input.effort } : {}),
        }),
      });
      const body = await response.json().catch(() => ({})) as {
        id?: string;
        model?: string;
        choices?: { message?: { content?: string; refusal?: string }; finish_reason?: string }[];
        usage?: { prompt_tokens?: number; completion_tokens?: number };
        error?: { message?: string };
      };
      if (!response.ok) {
        const message = body.error?.message ?? `HTTP ${response.status}`;
        if ([400, 401, 403, 404, 413].includes(response.status)) throw new NonRetryableError(message);
        throw new Error(message);
      }
      const choice = body.choices?.[0];
      if (choice?.message?.refusal) throw new NonRetryableError(`The model declined: ${choice.message.refusal}`);
      if (choice?.finish_reason === "length") throw new Error("Output truncated before the structured object completed.");
      return {
        text: choice?.message?.content ?? "",
        model: body.model ?? input.model,
        inputTokens: body.usage?.prompt_tokens,
        outputTokens: body.usage?.completion_tokens,
        responseId: body.id,
      };
    },
  };
}

export function createProvider(): Provider {
  const name = (process.env.CIVPRO_PROVIDER ?? "anthropic").toLowerCase();
  if (name === "anthropic") return anthropicProvider();
  if (name === "openai") return openAICompatibleProvider();
  throw new Error(`Unknown CIVPRO_PROVIDER "${name}". Use "anthropic" or "openai".`);
}
