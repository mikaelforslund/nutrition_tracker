"use client";

import { Dialog, StatusLabel } from "@trackerx/ui";
import { useCallback, useState, useTransition } from "react";
import { loadVisionConfig, type VisionConfig } from "@/app/config-actions";
import { VisionConfigForm } from "@/components/config-form";

/** Opens the app-wide settings over the current page, reading them fresh each time. */
export function SettingsButton() {
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState<VisionConfig | null>(null);
  const [failed, setFailed] = useState(false);
  const [, startLoading] = useTransition();
  const close = useCallback(() => setOpen(false), []);

  function show() {
    setOpen(true);
    setConfig(null);
    setFailed(false);
    startLoading(async () => {
      const loaded = await loadVisionConfig().catch(() => null);
      if (loaded) setConfig(loaded);
      else setFailed(true);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={show}
        className="rounded-md text-sm text-zinc-600 hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-accent"
      >
        Settings
      </button>
      {open ? (
        <Dialog open onClose={close} title="Settings" description="Options for the whole app, for everyone using it.">
          {config ? (
            <VisionConfigForm {...config} onClose={close} />
          ) : failed ? (
            <p role="alert">
              <StatusLabel tone="critical">The settings couldn&apos;t be loaded.</StatusLabel>
            </p>
          ) : (
            <p role="status" className="text-sm text-zinc-500">
              Loading
            </p>
          )}
        </Dialog>
      ) : null}
    </>
  );
}
