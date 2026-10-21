import * as React from "react";
import { cn } from "@/lib/utils";

const tones = {
  neutral: "border-line bg-paper text-ink-2",
  success: "border-accent/20 bg-accent-soft text-accent-strong",
  warning: "border-warning/20 bg-[#fffaeb] text-warning",
  danger: "border-negative/20 bg-[#fef3f2] text-negative",
};

export function Badge({
  className,
  tone = "neutral",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof tones }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
