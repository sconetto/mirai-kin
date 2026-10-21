import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export function Tabs({
  items,
}: {
  items: { href: string; label: string; active: boolean }[];
}) {
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
