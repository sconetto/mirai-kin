import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export function Tabs({
  items,
  variant = "underline",
}: {
  items: { href: string; label: string; active: boolean }[];
  variant?: "underline" | "pills" | "segmented";
}) {
  if (variant === "pills") {
    return (
      <nav className="flex flex-wrap items-center gap-1">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm transition-colors",
              item.active
                ? "bg-subtle font-medium text-ink"
                : "text-ink-3 hover:bg-paper hover:text-ink",
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    );
  }

  if (variant === "segmented") {
    return (
      <nav
        className="grid border-b border-line"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "border-b-2 px-2 py-3 text-center text-sm transition-colors",
              item.active
                ? "border-ink font-medium text-ink"
                : "border-transparent text-ink-3 hover:text-ink",
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    );
  }

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-line">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "whitespace-nowrap border-b-2 px-3 py-2 text-sm transition-colors",
            item.active
              ? "border-accent font-medium text-ink"
              : "border-transparent text-ink-3 hover:text-ink",
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
