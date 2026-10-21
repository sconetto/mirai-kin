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
import { intlLocale } from "@/lib/format";

export function BalanceChart({
  data,
  locale,
}: {
  data: { name: string; total: number }[];
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
    <div style={{ height: Math.max(220, data.length * 28) }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e7ec" horizontal={false} />
          <XAxis
            type="number"
            tickFormatter={(value: number) => compact.format(value)}
            tick={{ fontSize: 12, fill: "#667085" }}
            tickLine={false}
            axisLine={{ stroke: "#e4e7ec" }}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={160}
            tick={{ fontSize: 12, fill: "#667085" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #d0d5dd",
              fontSize: 12,
              color: "#101828",
            }}
          />
          <Bar
            dataKey="total"
            fill="#0b6b5d"
            radius={[0, 4, 4, 0]}
            maxBarSize={24}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
