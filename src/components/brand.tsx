import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn("inline-grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent text-white", className)}
      aria-hidden="true"
    >
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
        <rect x="2" y="11" width="4" height="7" rx="1" fill="currentColor" />
        <rect x="8" y="7" width="4" height="11" rx="1" fill="currentColor" />
        <rect x="14" y="2" width="4" height="16" rx="1" fill="currentColor" />
      </svg>
    </span>
  );
}
