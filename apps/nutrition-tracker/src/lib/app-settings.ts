import "server-only";
import { getSql } from "./db";
import { getEnv } from "./env";
import {
  VISION_PROVIDERS,
  type VisionProviderName,
  type VisionSettings,
  type VisionSettingsInput,
} from "./vision/settings";

const KEYS = {
  provider: "vision.provider",
  baseUrl: "vision.base_url",
  model: "vision.model",
  apiKey: "vision.api_key",
} as const;

async function readStored(): Promise<Map<string, string>> {
  // Settings can only be saved with mock auth, so cloud deployments use the environment.
  if (getEnv().AUTH_MODE !== "mock") return new Map();

  const rows = await getSql()<{ key: string; value: string }[]>`
    select key, value from app_nutrition.app_settings
  `;
  return new Map(rows.map(({ key, value }) => [key, value]));
}

/** Saved settings where they exist, otherwise the environment. */
export async function getVisionSettings(): Promise<VisionSettings> {
  const env = getEnv();
  const stored = await readStored();

  const savedProvider = stored.get(KEYS.provider);
  const provider = VISION_PROVIDERS.find((name) => name === savedProvider) ?? env.VISION_PROVIDER;

  return {
    provider: provider as VisionProviderName,
    baseUrl: stored.get(KEYS.baseUrl) ?? env.VISION_BASE_URL,
    model: stored.get(KEYS.model) ?? env.VISION_MODEL,
    apiKey: stored.get(KEYS.apiKey) ?? env.VISION_API_KEY,
  };
}

export async function saveVisionSettings(input: VisionSettingsInput): Promise<void> {
  await getSql().begin(async (tx) => {
    const entries = [
      [KEYS.provider, input.provider],
      [KEYS.baseUrl, input.baseUrl],
      [KEYS.model, input.model],
      ...(input.apiKey ? [[KEYS.apiKey, input.apiKey]] : []),
    ];

    for (const [key, value] of entries) {
      await tx`
        insert into app_nutrition.app_settings (key, value)
        values (${key!}, ${value!})
        on conflict (key) do update set value = excluded.value, updated_at = now()
      `;
    }

    if (input.clearApiKey && !input.apiKey) {
      await tx`delete from app_nutrition.app_settings where key = ${KEYS.apiKey}`;
    }
  });
}
