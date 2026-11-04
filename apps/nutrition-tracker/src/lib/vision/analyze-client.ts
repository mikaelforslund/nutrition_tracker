import { visionResponseSchema } from "./contract";

export type MealDraft = {
  foodName: string;
  proteinG: string;
  carbsG: string;
  fatG: string;
  imageUrl: string;
  confidence: number;
};

/** Sends a photo to the vision API from the browser and returns an editable draft. */
export async function analyzeImage(
  file: File,
  signal: AbortSignal,
  asUserId?: string,
): Promise<MealDraft> {
  const body = new FormData();
  body.set("task", "NUTRITION");
  body.set("image", file);

  const response = await fetch("/api/vision/analyze", {
    method: "POST",
    body,
    signal,
    headers: asUserId ? { "x-act-as": asUserId } : undefined,
  });
  const payload = visionResponseSchema.parse(await response.json());

  if (!payload.ok) throw new Error(payload.error.message);

  const { result } = payload.analysis;
  return {
    foodName: result.foodName,
    proteinG: String(result.proteinG),
    carbsG: String(result.carbsG),
    fatG: String(result.fatG),
    imageUrl: payload.imageUrl,
    confidence: result.confidence,
  };
}
