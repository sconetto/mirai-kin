"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency, intlLocale } from "@/lib/format";

export function BalanceChart({
  data,
  locale,
  currency,
}: {
  data: { name: string; total: number }[];
  locale: string;
  currency: string;
}) {
  if (data.length === 0) {
    return <div className="flex h-40 items-center justify-center text-sm text-ink-3">—</div>;
  }

  const compact = new Intl.NumberFormat(intlLocale(locale), {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  });

  return (
    <div style={{ height: Math.max(220, data.length * 28) }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" horizontal={false} />
          <XAxis
            type="number"
            tickFormatter={(value: number) => compact.format(value)}
            tick={{ fontSize: 12, fill: "var(--color-ink-3)" }}
            tickLine={false}
            axisLine={{ stroke: "var(--color-line)" }}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={160}
            tick={{ fontSize: 12, fill: "var(--color-ink-3)" }}
            tickLine={false}
            axisLine={false}
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
          <Bar
            dataKey="total"
            fill="var(--color-accent)"
            radius={[0, 4, 4, 0]}
            maxBarSize={24}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
