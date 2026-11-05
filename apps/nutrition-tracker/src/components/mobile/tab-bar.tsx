"use client";

import { cn } from "@trackerx/ui";
import { ChartLine, CircleUserRound, Clock, House, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { CaptureSheet } from "./capture-sheet";

const TAB = "flex flex-1 flex-col items-center gap-0.5 pt-1.5 text-[10px] font-medium";

export function TabBar() {
  const pathname = usePathname();
  const [capturing, setCapturing] = useState(false);

  const tab = (href: string, label: string, Icon: typeof House) => (
    <Link
      href={href}
      aria-current={pathname === href ? "page" : undefined}
      className={cn(TAB, pathname === href ? "text-ios-blue" : "text-ios-secondary")}
    >
      <Icon aria-hidden className="size-6" />
      {label}
    </Link>
  );

  return (
    <>
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-ios-separator bg-ios-bar pb-[env(safe-area-inset-bottom)] backdrop-blur-xl"
      >
        {tab("/m", "Today", House)}
        {tab("/m/history", "History", Clock)}
        <button
          type="button"
          onClick={() => setCapturing(true)}
          className={cn(TAB, "text-ios-secondary")}
        >
          <span className="flex size-6 items-center justify-center rounded-full bg-ios-blue text-white">
            <Plus aria-hidden className="size-4" strokeWidth={3} />
          </span>
          Add Meal
        </button>
        {tab("/m/progress", "Progress", ChartLine)}
        {tab("/m/account", "Account", CircleUserRound)}
      </nav>
      {capturing ? <CaptureSheet onClose={() => setCapturing(false)} /> : null}
    </>
  );
}
