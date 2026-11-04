import { z } from "zod";
import type { VisionTask } from "./contract";
import { ImageNotRecognizedError, type VisionInput, type VisionProvider } from "./provider";
import { shrinkImage } from "./shrink-image";

const NUTRITION_PROMPT = [
  "You are a nutrition analyst. Identify the meal in the photo and estimate the total for",
  "everything visible, judging portion size from the plate and surroundings.",
  "Give the total grams of protein, carbs, and fat.",
  "Set isFood to false, with zero values, if the photo does not show food.",
  "confidence is 0 to 1.",
].join(" ");

const NUTRITION_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["isFood", "foodName", "proteinG", "carbsG", "fatG", "confidence"],
  properties: {
    isFood: { type: "boolean" },
    foodName: { type: "string" },
    proteinG: { type: "number" },
    carbsG: { type: "number" },
    fatG: { type: "number" },
    confidence: { type: "number" },
  },
} as const;

const nutritionOutputSchema = z.object({
  isFood: z.boolean(),
  foodName: z.string(),
  proteinG: z.number(),
  carbsG: z.number(),
  fatG: z.number(),
  confidence: z.number(),
});

const completionSchema = z.object({
  choices: z.array(z.object({ message: z.object({ content: z.string() }) })).min(1),
});

const TASKS = {
  NUTRITION: {
    prompt: NUTRITION_PROMPT,
    schemaName: "nutrition",
    jsonSchema: NUTRITION_JSON_SCHEMA,
    parse(content: unknown) {
      const { isFood, ...output } = nutritionOutputSchema.parse(content);
      if (!isFood) throw new ImageNotRecognizedError();

      return {
        task: "NUTRITION" as const,
        // Worked out here because models don't reliably keep the two consistent.
        result: {
          ...output,
          calories: Math.round(output.proteinG * 4 + output.carbsG * 4 + output.fatG * 9),
        },
      };
    },
  },
} satisfies Record<VisionTask, unknown>;

async function imageUrl(input: VisionInput, maxDimension: number): Promise<string> {
  if (input.kind === "url") return input.url;

  // A file can pass the signature check and still be undecodable.
  const shrunk = await shrinkImage(input.bytes, maxDimension).catch(() => {
    throw new ImageNotRecognizedError();
  });
  return `data:image/jpeg;base64,${shrunk.toString("base64")}`;
}

export type OpenAiVisionConfig = {
  baseUrl: string;
  model: string;
  apiKey?: string;
  timeoutMs: number;
  maxImageDimension: number;
};

/** Talks to any OpenAI-compatible server with vision support, such as Ollama or vLLM. */
export function createOpenAiVisionProvider(config: OpenAiVisionConfig): VisionProvider {
  return {
    model: config.model,

    async analyze(task, input, signal) {
      const definition = TASKS[task];
      const image = await imageUrl(input, config.maxImageDimension);
      const timeout = AbortSignal.timeout(config.timeoutMs);

      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: "POST",
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
        headers: {
          "Content-Type": "application/json",
          ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
        },
        body: JSON.stringify({
          model: config.model,
          temperature: 0,
          // Thinking made answers about 10x slower without making them better.
          reasoning_effort: "none",
          response_format: {
            type: "json_schema",
            json_schema: {
              name: definition.schemaName,
              strict: true,
              schema: definition.jsonSchema,
            },
          },
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: definition.prompt },
                { type: "image_url", image_url: { url: image } },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`Vision backend returned status ${response.status}`);
      }

      const completion = completionSchema.parse(await response.json());
      const content = completion.choices[0]?.message.content ?? "";
      return definition.parse(JSON.parse(content));
    },
  };
}
