"use client";

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

export function ScenarioChart({
  data,
  labels,
}: {
  data: { month: string; base: number; optimistic: number; pessimistic: number }[];
  labels: { base: string; optimistic: string; pessimistic: string };
}) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e7ec" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 12, fill: "#667085" }}
            tickLine={false}
            axisLine={{ stroke: "#e4e7ec" }}
            minTickGap={24}
          />
          <YAxis
            tick={{ fontSize: 12, fill: "#667085" }}
            tickLine={false}
            axisLine={false}
            width={72}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #d0d5dd",
              fontSize: 12,
              color: "#101828",
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: "#475467" }} />
          <Line
            type="monotone"
            dataKey="base"
            name={labels.base}
            stroke="#0b6b5d"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="optimistic"
            name={labels.optimistic}
            stroke="#067647"
            strokeWidth={2}
            strokeDasharray="4 3"
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="pessimistic"
            name={labels.pessimistic}
            stroke="#b42318"
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
