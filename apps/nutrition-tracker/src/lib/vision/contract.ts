import { z } from "zod";

/**
 * The wire contract for POST /api/vision/analyze, shared by server and browser.
 * To add a task: extend VISION_TASKS, add a branch to visionAnalysisSchema, and
 * handle it in the provider.
 */
export const VISION_TASKS = ["NUTRITION"] as const;
export const visionTaskSchema = z.enum(VISION_TASKS);
export type VisionTask = z.infer<typeof visionTaskSchema>;

export const nutritionResultSchema = z.object({
  foodName: z.string().min(1).max(200),
  calories: z.number().int().min(0),
  proteinG: z.number().min(0),
  carbsG: z.number().min(0),
  fatG: z.number().min(0),
  confidence: z.number().min(0).max(1),
});
export type NutritionResult = z.infer<typeof nutritionResultSchema>;

export const visionAnalysisSchema = z.discriminatedUnion("task", [
  z.object({ task: z.literal("NUTRITION"), result: nutritionResultSchema }),
]);
export type VisionAnalysis = z.infer<typeof visionAnalysisSchema>;

export const VISION_ERROR_CODES = [
  "UNAUTHENTICATED",
  "INVALID_REQUEST",
  "UNSUPPORTED_MEDIA_TYPE",
  "IMAGE_TOO_LARGE",
  "IMAGE_HOST_NOT_ALLOWED",
  "IMAGE_NOT_RECOGNIZED",
  "LENGTH_REQUIRED",
  "INFERENCE_FAILED",
] as const;

export const visionResponseSchema = z.discriminatedUnion("ok", [
  z.object({
    ok: z.literal(true),
    requestId: z.uuid(),
    model: z.string(),
    imageUrl: z.string(),
    analysis: visionAnalysisSchema,
  }),
  z.object({
    ok: z.literal(false),
    requestId: z.uuid(),
    error: z.object({
      code: z.enum(VISION_ERROR_CODES),
      message: z.string(),
    }),
  }),
]);
export type VisionResponse = z.infer<typeof visionResponseSchema>;

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
