import type { ReactNode } from "react";
import { TabBar } from "@/components/mobile/tab-bar";

export default function TabsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="pt-[env(safe-area-inset-top)] pb-[calc(env(safe-area-inset-bottom)+5.5rem)]">
        {children}
      </div>
      <TabBar />
    </>
  );
}
