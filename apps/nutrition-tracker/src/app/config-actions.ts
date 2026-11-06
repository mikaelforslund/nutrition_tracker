"use server";

import { getVisionSettings, saveVisionSettings } from "@/lib/app-settings";
import { getEnv } from "@/lib/env";
import {
  baseUrlSchema,
  normalizeBaseUrl,
  parseModelList,
  visionSettingsInputSchema,
  type VisionProviderName,
} from "@/lib/vision/settings";

export type ConfigResult = { status: "idle" | "saved" | "error"; message?: string };

export type ConnectionResult =
  | { status: "ok"; models: string[] }
  | { status: "error"; message: string };

/** What the settings form shows. The API key itself never goes to the browser. */
export type VisionConfig = {
  provider: VisionProviderName;
  baseUrl: string;
  model: string;
  hasApiKey: boolean;
};

const CONNECTION_TIMEOUT_MS = 5000;

// There's no real sign-in yet, so these can't be offered on a deployed site.
export async function loadVisionConfig(): Promise<VisionConfig | null> {
  if (getEnv().AUTH_MODE !== "mock") return null;

  const { provider, baseUrl, model, apiKey } = await getVisionSettings();
  return { provider, baseUrl, model, hasApiKey: Boolean(apiKey) };
}

export async function saveVisionConfig(_previous: ConfigResult, form: FormData): Promise<ConfigResult> {
  if (getEnv().AUTH_MODE !== "mock") return { status: "error", message: "Settings aren't available here." };

  const parsed = visionSettingsInputSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    const label = field === "baseUrl" ? "the endpoint URL" : field === "model" ? "the model" : "the settings";
    return { status: "error", message: `Check ${label}.` };
  }

  await saveVisionSettings(parsed.data);
  return { status: "saved", message: "Settings saved." };
}

/**
 * Lists the models at an endpoint. Only ever reports names or a fixed message, so
 * this can't be used to read other services through the server.
 */
export async function testVisionConnection(baseUrl: unknown, apiKey: unknown): Promise<ConnectionResult> {
  if (getEnv().AUTH_MODE !== "mock") return { status: "error", message: "Settings aren't available here." };

  const url = baseUrlSchema.safeParse(baseUrl);
  if (!url.success) return { status: "error", message: "Enter a valid http or https URL." };

  // A saved key only ever goes to the endpoint it was saved for, or anyone who can
  // reach this page could capture it by testing a server of their own.
  const saved = await getVisionSettings();
  const savedKey = normalizeBaseUrl(saved.baseUrl) === url.data ? saved.apiKey : undefined;
  const key = (typeof apiKey === "string" && apiKey.trim()) || savedKey;

  try {
    const response = await fetch(`${url.data}/models`, {
      signal: AbortSignal.timeout(CONNECTION_TIMEOUT_MS),
      headers: key ? { Authorization: `Bearer ${key}` } : undefined,
    });

    if (response.status === 401 || response.status === 403) {
      return { status: "error", message: "The endpoint refused the API key." };
    }
    if (!response.ok) {
      return { status: "error", message: `The endpoint replied with status ${response.status}.` };
    }

    const models = parseModelList(await response.json().catch(() => null));
    return models
      ? { status: "ok", models }
      : { status: "error", message: "That doesn't look like an OpenAI-compatible endpoint." };
  } catch {
    return { status: "error", message: "Couldn't reach that endpoint." };
  }
}
