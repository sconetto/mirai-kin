import { Card, CardContent } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { cn } from "@/lib/utils";

export function Stat({
  label,
  value,
  tone,
  mono = true,
  accent = false,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative";
  mono?: boolean;
  accent?: boolean;
}) {
  const color =
    tone === "positive" ? "text-positive" : tone === "negative" ? "text-negative" : "text-ink";
  return (
    <Card className={accent ? "border-t-2 border-t-accent" : undefined}>
      <CardContent className="py-5">
        <p className="text-sm font-medium text-ink-3">{label}</p>
        {mono ? (
          <Money className={cn("mt-2 block text-2xl font-semibold tracking-tight", color)}>
            {value}
          </Money>
        ) : (
          <p className={cn("mt-2 text-2xl font-semibold tracking-tight", color)}>{value}</p>
        )}
      </CardContent>
    </Card>
  );
}
