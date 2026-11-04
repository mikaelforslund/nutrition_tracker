import { z } from "zod";

export const VISION_PROVIDERS = ["openai", "mock"] as const;
export type VisionProviderName = (typeof VISION_PROVIDERS)[number];

export type VisionSettings = {
  provider: VisionProviderName;
  baseUrl: string;
  model: string;
  apiKey?: string;
};

const httpUrl = z.url({ protocol: /^https?$/ });

/** Removes the trailing slash, so paths can be appended safely. */
export const normalizeBaseUrl = (url: string) => url.trim().replace(/\/+$/, "");

export const baseUrlSchema = z.string().trim().pipe(httpUrl).transform(normalizeBaseUrl);

export const visionSettingsInputSchema = z.object({
  provider: z.enum(VISION_PROVIDERS),
  baseUrl: baseUrlSchema,
  model: z.string().trim().min(1).max(200),
  apiKey: z.string().trim().max(500),
  clearApiKey: z.literal("on").optional(),
});
export type VisionSettingsInput = z.infer<typeof visionSettingsInputSchema>;

const modelListSchema = z.object({ data: z.array(z.object({ id: z.string() })) });

/** Pulls model names out of an OpenAI-compatible /models response. */
export function parseModelList(body: unknown): string[] | null {
  const parsed = modelListSchema.safeParse(body);
  return parsed.success ? parsed.data.data.map(({ id }) => id).sort() : null;
}
