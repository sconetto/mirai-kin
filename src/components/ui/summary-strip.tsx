import { cn } from "@/lib/utils";

export function SummaryStrip({
  items,
}: {
  items: { label: string; value: string; tone?: "positive" | "negative" }[];
}) {
  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-line/70 sm:grid-cols-4">
      {items.map((item, index) => (
        <div
          key={item.label}
          className={cn(
            "border-line/70 px-4 py-3",
            index % 2 === 1 && "border-l",
            index >= 2 && "border-t",
            "sm:border-t-0",
            index > 0 && "sm:border-l",
          )}
        >
          <p className="text-xs text-ink-3">{item.label}</p>
          <p
            className={cn(
              "mt-1 font-mono text-sm font-semibold tabular",
              item.tone === "positive"
                ? "text-positive"
                : item.tone === "negative"
                  ? "text-negative"
                  : "text-ink",
            )}
          >
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}
