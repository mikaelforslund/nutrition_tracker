"use client";

import { Button, Field, Input, Select, StatusLabel } from "@trackerx/ui";
import { useActionState, useEffect, useState, useTransition } from "react";
import {
  saveVisionConfig,
  testVisionConnection,
  type ConfigResult,
  type ConnectionResult,
  type VisionConfig,
} from "@/app/config-actions";
import type { VisionProviderName } from "@/lib/vision/settings";

const INITIAL: ConfigResult = { status: "idle" };

export function VisionConfigForm({
  provider: savedProvider,
  baseUrl: savedBaseUrl,
  model: savedModel,
  hasApiKey,
  onClose,
}: VisionConfig & { onClose: () => void }) {
  const [result, action, isSaving] = useActionState(saveVisionConfig, INITIAL);
  const [provider, setProvider] = useState(savedProvider);
  const [baseUrl, setBaseUrl] = useState(savedBaseUrl);
  const [apiKey, setApiKey] = useState("");
  const [connection, setConnection] = useState<ConnectionResult | null>(null);
  const [isTesting, startTesting] = useTransition();

  const usesEndpoint = provider === "openai";

  useEffect(() => {
    if (result.status === "saved") onClose();
  }, [result, onClose]);

  function testConnection() {
    setConnection(null);
    startTesting(async () => {
      const outcome = await testVisionConnection(baseUrl, apiKey).catch(() => null);
      setConnection(outcome ?? { status: "error", message: "Couldn't run the test. Try again." });
    });
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-medium text-zinc-900">Vision model</h3>
        <p className="text-xs text-zinc-500">The model that analyzes meal photos. Changes apply to the next photo.</p>
      </div>
      <Field label="Provider">
        <Select
          name="provider"
          value={provider}
          onChange={(event) => setProvider(event.target.value as VisionProviderName)}
        >
          <option value="openai">OpenAI-compatible endpoint (Ollama, vLLM)</option>
          <option value="mock">Mock (canned answers, for testing)</option>
        </Select>
      </Field>

      <div className={usesEndpoint ? "flex flex-col gap-4" : "hidden"}>
        <Field
          label="Endpoint URL"
          hint="Ollama on this Mac is http://host.containers.internal:11434/v1 from inside Podman, or http://localhost:11434/v1 with pnpm dev."
        >
          <Input
            name="baseUrl"
            required
            value={baseUrl}
            onChange={(event) => {
              setBaseUrl(event.target.value);
              setConnection(null);
            }}
          />
        </Field>

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" onClick={testConnection} disabled={isTesting || !baseUrl}>
            {isTesting ? "Testing" : "Test connection"}
          </Button>
          {connection?.status === "ok" ? (
            <StatusLabel tone="good">
              Connected, {connection.models.length} {connection.models.length === 1 ? "model" : "models"} found
            </StatusLabel>
          ) : null}
          {connection?.status === "error" ? (
            <StatusLabel tone="critical">{connection.message}</StatusLabel>
          ) : null}
        </div>

        <Field label="Model" hint="It must be able to read images. Test connection fills in this list.">
          <Input
            name="model"
            required
            maxLength={200}
            list="vision-models"
            defaultValue={savedModel}
            autoComplete="off"
          />
          <datalist id="vision-models">
            {connection?.status === "ok"
              ? connection.models.map((name) => <option key={name} value={name} />)
              : null}
          </datalist>
        </Field>

        <Field
          label="API key"
          hint={hasApiKey ? "A key is saved. Leave this blank to keep it." : "Only needed for hosted endpoints."}
        >
          <Input
            name="apiKey"
            type="password"
            autoComplete="new-password"
            value={apiKey}
            placeholder={hasApiKey ? "••••••••" : ""}
            onChange={(event) => setApiKey(event.target.value)}
          />
        </Field>
        {hasApiKey ? (
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input type="checkbox" name="clearApiKey" />
            Remove the saved API key
          </label>
        ) : null}
      </div>

      {/* The fields above are required by the server even when hidden for the mock. */}
      {result.status === "error" ? (
        <p role="alert">
          <StatusLabel tone="critical">{result.message}</StatusLabel>
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose} disabled={isSaving}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? "Saving" : "Save settings"}
        </Button>
      </div>
    </form>
  );
}
