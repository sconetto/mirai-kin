import * as React from "react";
import { cn } from "@/lib/utils";

const field =
  "w-full rounded-lg border border-line bg-surface text-sm text-ink shadow-[0_1px_2px_rgba(16,24,40,0.04)] " +
  "outline-none transition placeholder:text-ink-3 " +
  "focus:border-accent focus:ring-4 focus:ring-accent/10 disabled:bg-paper disabled:text-ink-3";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(field, "h-10 px-3", className)} {...props} />;
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(field, "h-10 px-3", className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(field, "px-3 py-2", className)} {...props} />;
}
