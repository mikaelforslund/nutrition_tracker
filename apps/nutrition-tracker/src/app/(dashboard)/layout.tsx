import Link from "next/link";
import type { ReactNode } from "react";
import { SettingsButton } from "@/components/settings-button";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-zinc-50 text-zinc-950">
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white">
        <nav className="mx-auto flex h-10 max-w-[100rem] items-center justify-between px-4 sm:px-6">
          <Link href="/" className="text-sm font-semibold tracking-tight">
            Nutrition Tracker
          </Link>
          {process.env.AUTH_MODE === "mock" ? (
            <SettingsButton />
          ) : null}
        </nav>
      </header>
      <main className="mx-auto max-w-[100rem] px-4 py-3 sm:px-6">{children}</main>
    </div>
  );
}
