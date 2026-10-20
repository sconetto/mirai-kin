import * as React from "react";
import { cn } from "@/lib/utils";

export function Money({
  children,
  className,
  tone,
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "positive" | "negative" | "muted";
}) {
  return (
    <span
      className={cn(
        "font-mono tabular",
        tone === "positive" && "text-positive",
        tone === "negative" && "text-negative",
        tone === "muted" && "text-ink-3",
        className,
      )}
    >
      {children}
    </span>
  );
}
