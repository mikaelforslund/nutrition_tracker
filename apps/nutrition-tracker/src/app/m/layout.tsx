import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Nutrition",
  appleWebApp: { capable: true, title: "Nutrition", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f2f7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function MobileLayout({ children }: { children: ReactNode }) {
  return (
    <div className="ios-app min-h-dvh bg-ios-bg font-ios text-[17px] leading-snug text-ios-label">
      {children}
    </div>
  );
}
