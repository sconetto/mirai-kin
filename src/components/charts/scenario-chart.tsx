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

export type ScenarioSeries = {
  key: string;
  label: string;
  color: string;
};

export function ScenarioChart({
  data,
  series,
  currency,
}: {
  data: Record<string, string | number | null>[];
  series: ScenarioSeries[];
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
          {series.map((item, index) => (
            <Line
              key={item.key}
              type="monotone"
              dataKey={item.key}
              name={item.label}
              stroke={item.color}
              strokeWidth={index === 0 ? 2.5 : 2}
              strokeDasharray={index === 0 ? undefined : "4 3"}
              dot={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
