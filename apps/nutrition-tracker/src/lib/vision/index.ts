import "server-only";
import { getVisionSettings } from "../app-settings";
import { getEnv } from "../env";
import { createMockVisionProvider } from "./mock-provider";
import { createOpenAiVisionProvider } from "./openai-provider";
import type { VisionProvider } from "./provider";

export async function getVisionProvider(): Promise<VisionProvider> {
  const env = getEnv();
  const settings = await getVisionSettings();

  if (settings.provider === "openai") {
    return createOpenAiVisionProvider({
      baseUrl: settings.baseUrl,
      model: settings.model,
      apiKey: settings.apiKey,
      timeoutMs: env.VISION_TIMEOUT_MS,
      maxImageDimension: env.VISION_MAX_IMAGE_PX,
    });
  }

  return createMockVisionProvider({ latencyMs: env.MOCK_VISION_LATENCY_MS });
}
