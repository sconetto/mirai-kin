"use client";

import { useLocale } from "next-intl";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency, intlLocale } from "@/lib/format";

export function ScenarioChart({
  data,
  labels,
  currency,
}: {
  data: { month: string; base: number; optimistic: number; pessimistic: number }[];
  labels: { base: string; optimistic: string; pessimistic: string };
  currency: string;
}) {
  const locale = useLocale();
  const compact = new Intl.NumberFormat(intlLocale(locale), {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  });

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 12, fill: "var(--color-ink-3)" }}
            tickLine={false}
            axisLine={{ stroke: "var(--color-line)" }}
            minTickGap={24}
          />
          <YAxis
            tickFormatter={(value: number) => compact.format(value)}
            tick={{ fontSize: 12, fill: "var(--color-ink-3)" }}
            tickLine={false}
            axisLine={false}
            width={72}
          />
          <Tooltip
            formatter={(value) => formatCurrency(Number(value), currency, locale)}
            contentStyle={{
              background: "var(--color-surface)",
              borderRadius: 8,
              border: "1px solid var(--color-line)",
              fontSize: 12,
              color: "var(--color-ink)",
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: "var(--color-ink-3)" }} />
          <Line
            type="monotone"
            dataKey="base"
            name={labels.base}
            stroke="var(--color-accent)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="optimistic"
            name={labels.optimistic}
            stroke="var(--color-positive)"
            strokeWidth={2}
            strokeDasharray="4 3"
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="pessimistic"
            name={labels.pessimistic}
            stroke="var(--color-negative)"
            strokeWidth={2}
            strokeDasharray="4 3"
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
