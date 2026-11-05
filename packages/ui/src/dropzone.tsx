"use client";

import { ImageUp } from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent, type DragEvent, type MouseEvent, type ReactNode } from "react";
import { cn } from "./cn";

export type DropzoneProps = {
  onFile: (file: File) => void;
  onReject?: (message: string) => void;
  accept: readonly string[];
  maxBytes: number;
  title?: ReactNode;
  hint?: string;
  disabled?: boolean;
  /** Also accepts images pasted with Cmd/Ctrl+V, or read with Cmd/Ctrl+click. */
  allowPaste?: boolean;
  className?: string;
};

function isTypingTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  );
}

export function Dropzone({
  onFile,
  onReject,
  accept,
  maxBytes,
  title = "Drop a file here, or click to browse",
  hint,
  disabled = false,
  allowPaste = false,
  className,
}: DropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  function handleFile(file: File | undefined) {
    if (!file || disabled) return;
    if (!accept.includes(file.type)) {
      onReject?.("That file type isn't supported.");
      return;
    }
    if (file.size > maxBytes) {
      onReject?.(`That file is over the ${Math.floor(maxBytes / 1024 / 1024)} MB limit.`);
      return;
    }
    onFile(file);
  }

  // The listener lives for the whole component, so it always calls the latest version.
  const handleFileRef = useRef(handleFile);
  useEffect(() => {
    handleFileRef.current = handleFile;
  });

  useEffect(() => {
    if (!allowPaste) return;

    function handlePaste(event: ClipboardEvent) {
      if (isTypingTarget(event.target)) return;

      const file = [...(event.clipboardData?.files ?? [])][0];
      if (!file) return;

      event.preventDefault();
      handleFileRef.current(file);
    }

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [allowPaste]);

  async function pasteFromClipboard() {
    // The clipboard API only exists on https and localhost.
    if (!navigator.clipboard?.read) {
      onReject?.("Can't read the clipboard here. Press Cmd+V to paste instead.");
      return;
    }

    try {
      for (const item of await navigator.clipboard.read()) {
        const type = item.types.find((candidate) => candidate.startsWith("image/"));
        if (type) {
          const blob = await item.getType(type);
          handleFile(new File([blob], "pasted-image", { type }));
          return;
        }
      }
      onReject?.("There's no image on your clipboard.");
    } catch {
      onReject?.("Clipboard access was blocked. Press Cmd+V to paste instead.");
    }
  }

  function handleClick(event: MouseEvent<HTMLLabelElement>) {
    if (!allowPaste || !(event.metaKey || event.ctrlKey)) return;

    event.preventDefault();
    void pasteFromClipboard();
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);
    handleFile(event.dataTransfer.files[0]);
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    handleFile(event.target.files?.[0]);
    // Lets the user pick the same file again after discarding it.
    event.target.value = "";
  }

  return (
    <label
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={handleClick}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed",
        "border-zinc-300 bg-zinc-50 px-6 py-10 text-center transition-colors hover:bg-zinc-100",
        "focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent",
        isDragging && "border-accent bg-accent-track/40",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
    >
      <ImageUp aria-hidden className="size-6 text-zinc-500" />
      <span className="text-sm font-medium text-zinc-900">{title}</span>
      {hint ? <span className="text-xs text-zinc-500">{hint}</span> : null}
      <input
        type="file"
        accept={accept.join(",")}
        disabled={disabled}
        onChange={handleChange}
        className="sr-only"
      />
    </label>
  );
}
