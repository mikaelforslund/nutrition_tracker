"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export function BackButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="flex items-center text-ios-blue active:opacity-50"
    >
      <ChevronLeft aria-hidden className="size-7 -ml-2" />
      Back
    </button>
  );
}
