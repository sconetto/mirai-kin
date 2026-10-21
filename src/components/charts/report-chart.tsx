"use client";

import { ChartColumn, ChartLine } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { intlLocale } from "@/lib/format";
import { cn } from "@/lib/utils";

export function ReportChart({
  data,
  label,
  locale,
}: {
  data: { name: string; total: number }[];
  label: string;
  locale: string;
}) {
  const t = useTranslations("reports");
  const [variant, setVariant] = useState<"bar" | "line">("bar");

  if (data.length === 0) {
    return <div className="flex h-64 items-center justify-center text-sm text-ink-3">—</div>;
  }

  const values = data.map((item) => item.total);
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const domain: [number, number] = min === max ? [0, 1] : [min, max];
  const compact = new Intl.NumberFormat(intlLocale(locale), {
    notation: "compact",
    maximumFractionDigits: 1,
  });
  const formatTick = (value: number) => compact.format(value);

  const axes = (
    <>
      <CartesianGrid strokeDasharray="3 3" stroke="#e4e7ec" vertical={false} />
      <XAxis
        dataKey="name"
        tick={{ fontSize: 12, fill: "#667085" }}
        tickLine={false}
        axisLine={{ stroke: "#e4e7ec" }}
      />
      <YAxis
        domain={domain}
        tickFormatter={formatTick}
        tick={{ fontSize: 12, fill: "#667085" }}
        tickLine={false}
        axisLine={false}
        width={80}
      />
      <Tooltip
        contentStyle={{
          borderRadius: 8,
          border: "1px solid #d0d5dd",
          fontSize: 12,
          color: "#101828",
        }}
      />
    </>
  );

  return (
    <div>
      <div className="mb-2 flex justify-end">
        <div className="flex items-center gap-0.5 rounded-lg border border-line p-0.5">
          <button
            type="button"
            onClick={() => setVariant("bar")}
            aria-label={t("chartBar")}
            aria-pressed={variant === "bar"}
            className={cn(
              "rounded-md p-1.5 transition-colors",
              variant === "bar" ? "bg-subtle text-ink" : "text-ink-3 hover:text-ink",
            )}
          >
            <ChartColumn className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setVariant("line")}
            aria-label={t("chartLine")}
            aria-pressed={variant === "line"}
            className={cn(
              "rounded-md p-1.5 transition-colors",
              variant === "line" ? "bg-subtle text-ink" : "text-ink-3 hover:text-ink",
            )}
          >
            <ChartLine className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {variant === "bar" ? (
            <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
              {axes}
              <Bar
                dataKey="total"
                name={label}
                fill="#0b6b5d"
                radius={[4, 4, 0, 0]}
                maxBarSize={48}
                isAnimationActive={false}
              />
            </BarChart>
          ) : (
            <LineChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
              {axes}
              <Line
                type="monotone"
                dataKey="total"
                name={label}
                stroke="#0b6b5d"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
