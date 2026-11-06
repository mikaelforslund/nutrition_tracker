"use client";

import { Button, Dialog } from "@trackerx/ui";
import { useCallback, useState } from "react";
import { signOut } from "@/app/login/actions";
import { SettingsForm } from "@/components/settings-form";
import type { Profile } from "@/lib/nutrition/repository";

/** Opens the goals form over the dashboard. */
export function GoalsButton({
  label,
  title,
  profile,
  timezones,
  asUserId,
  canSignOut,
  className,
}: {
  label: string;
  title: string;
  profile: Profile;
  timezones: string[];
  asUserId?: string;
  canSignOut: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)} className={className}>
        {label}
      </Button>
      {open ? (
        <Dialog
          open
          onClose={close}
          title={title}
          description="Daily targets drive the dashboard. Current and goal weight drive the projection."
        >
          <SettingsForm profile={profile} timezones={timezones} asUserId={asUserId} onClose={close} />
          {canSignOut ? (
            <form action={signOut} className="mt-4 border-t border-zinc-200 pt-4">
              <Button type="submit" variant="secondary">
                Sign out
              </Button>
            </form>
          ) : null}
        </Dialog>
      ) : null}
    </>
  );
}
