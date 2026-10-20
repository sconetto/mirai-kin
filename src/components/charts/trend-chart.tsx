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
    return <div className="flex h-64 items-center justify-center text-sm text-slate-400">—</div>;
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="month" fontSize={12} tickLine={false} />
          <YAxis fontSize={12} tickLine={false} width={64} />
          <Tooltip />
          <Line
            type="monotone"
            dataKey={dataKey}
            name={label}
            stroke="#0f172a"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
