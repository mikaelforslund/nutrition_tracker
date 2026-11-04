import { buttonClasses } from "@trackerx/ui";
import Link from "next/link";
import { notFound } from "next/navigation";
import { VisionConfigForm } from "@/components/config-form";
import { getVisionSettings } from "@/lib/app-settings";
import { getEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

/** Add further settings as new cards here. */
export default async function ConfigPage() {
  // There's no real sign-in yet, so this can't be offered on a deployed site.
  if (getEnv().AUTH_MODE !== "mock") notFound();

  const vision = await getVisionSettings();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
          <p className="text-sm text-zinc-500">Options for the whole app, for everyone using it.</p>
        </div>
        <Link href="/" className={buttonClasses("secondary", "shrink-0")}>
          Done
        </Link>
      </div>
      <VisionConfigForm
        provider={vision.provider}
        baseUrl={vision.baseUrl}
        model={vision.model}
        hasApiKey={Boolean(vision.apiKey)}
      />
    </div>
  );
}
