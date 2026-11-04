"use client";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Field,
  Input,
  Select,
  StatusLabel,
} from "@trackerx/ui";
import { useActionState, useState, useTransition } from "react";
import {
  saveVisionConfig,
  testVisionConnection,
  type ConfigResult,
  type ConnectionResult,
} from "@/app/config-actions";
import type { VisionProviderName } from "@/lib/vision/settings";

const INITIAL: ConfigResult = { status: "idle" };

export function VisionConfigForm({
  provider: savedProvider,
  baseUrl: savedBaseUrl,
  model: savedModel,
  hasApiKey,
}: {
  provider: VisionProviderName;
  baseUrl: string;
  model: string;
  hasApiKey: boolean;
}) {
  const [result, action, isSaving] = useActionState(saveVisionConfig, INITIAL);
  const [provider, setProvider] = useState(savedProvider);
  const [baseUrl, setBaseUrl] = useState(savedBaseUrl);
  const [apiKey, setApiKey] = useState("");
  const [connection, setConnection] = useState<ConnectionResult | null>(null);
  const [isTesting, startTesting] = useTransition();

  const usesEndpoint = provider === "openai";

  function testConnection() {
    setConnection(null);
    startTesting(async () => {
      const outcome = await testVisionConnection(baseUrl, apiKey).catch(() => null);
      setConnection(outcome ?? { status: "error", message: "Couldn't run the test. Try again." });
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vision model</CardTitle>
        <CardDescription>The model that analyzes meal photos. Changes apply to the next photo.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="flex flex-col gap-4">
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
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving" : "Save settings"}
            </Button>
            <span role="status">
              {result.status === "saved" ? <StatusLabel tone="good">{result.message}</StatusLabel> : null}
              {result.status === "error" ? <StatusLabel tone="critical">{result.message}</StatusLabel> : null}
            </span>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
