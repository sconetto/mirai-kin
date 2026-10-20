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

export function TrendChart({
  data,
  dataKey,
  label,
}: {
  data: Record<string, string | number>[];
  dataKey: string;
  label: string;
}) {
  if (data.length === 0) {
    return <div className="flex h-64 items-center justify-center text-sm text-ink-3">—</div>;
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e7ec" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 12, fill: "#667085" }}
            tickLine={false}
            axisLine={{ stroke: "#e4e7ec" }}
          />
          <YAxis
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
            dataKey={dataKey}
            name={label}
            stroke="#0b6b5d"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
