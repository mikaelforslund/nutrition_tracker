import type { HTMLAttributes } from "react";
import { cn } from "./cn";

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  tone?: "default" | "inverse";
};

export function Card({ tone = "default", className, ...props }: CardProps) {
  return (
    <div
      data-tone={tone}
      className={cn(
        "group/card rounded-xl border shadow-xs",
        tone === "default" && "border-zinc-200 bg-white text-zinc-950",
        tone === "inverse" && "border-zinc-800 bg-zinc-950 text-zinc-50",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1 p-5 pb-0", className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("text-sm font-semibold tracking-tight", className)} {...props} />;
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-sm text-zinc-500 group-data-[tone=inverse]/card:text-zinc-400", className)}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5", className)} {...props} />;
}
