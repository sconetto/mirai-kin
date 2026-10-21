"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { intlLocale } from "@/lib/format";

export function PortfolioChart({
  data,
  locale,
}: {
  data: { date: string; value: number }[];
  locale: string;
}) {
  if (data.length === 0) {
    return <div className="flex h-40 items-center justify-center text-sm text-ink-3">—</div>;
  }

  const compact = new Intl.NumberFormat(intlLocale(locale), {
    notation: "compact",
    maximumFractionDigits: 1,
  });

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e7ec" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12, fill: "#667085" }}
            tickLine={false}
            axisLine={{ stroke: "#e4e7ec" }}
            minTickGap={32}
          />
          <YAxis
            tickFormatter={(value: number) => compact.format(value)}
            tick={{ fontSize: 12, fill: "#667085" }}
            tickLine={false}
            axisLine={false}
            width={64}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #d0d5dd",
              fontSize: 12,
              color: "#101828",
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#0b6b5d"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
