"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTranslations } from "next-intl";
import { formatCurrency, formatMonth, intlLocale } from "@/lib/format";

type Point = {
  date: string;
  actual: number | null;
  conservative: number | null;
  base: number | null;
  optimistic: number | null;
};

type Target = {
  name: string;
  targetDate: string | null;
  target: number;
  status: string;
};

export function PlanTrajectoryChart({
  data,
  goals,
  currency,
  locale,
}: {
  data: Point[];
  goals: Target[];
  currency: string;
  locale: string;
}) {
  const t = useTranslations("dashboard");

  if (data.length === 0) {
    return <div className="flex h-64 items-center justify-center text-sm text-ink-3">{t("noHistory")}</div>;
  }

  const compact = new Intl.NumberFormat(intlLocale(locale), {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  });
  const chartData = [...data];
  const seen = new Set(chartData.map((point) => point.date));
  for (const goal of goals) {
    if (!goal.targetDate || seen.has(goal.targetDate)) continue;
    chartData.push({
      date: goal.targetDate,
      actual: null,
      conservative: null,
      base: null,
      optimistic: null,
    });
    seen.add(goal.targetDate);
  }
  chartData.sort((a, b) => a.date.localeCompare(b.date));
  const targets = goals.filter((goal) => goal.targetDate);

  return (
    <figure className="w-full">
      <figcaption className="sr-only">
        {t("trajectorySummary", {
          current: formatCurrency(
            data.find((point) => point.actual !== null)?.actual ?? 0,
            currency,
            locale,
          ),
        })}
      </figcaption>
      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-3">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 bg-accent" /> {t("actual")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 border-t border-dashed border-accent" /> {t("baseProjection")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-4 rounded-sm bg-accent/10" /> {t("range")}
        </span>
      </div>
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 12, right: 16, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={(value: string) => formatMonth(value.slice(0, 7), locale)}
              tick={{ fontSize: 11, fill: "var(--color-ink-3)" }}
              tickLine={false}
              axisLine={{ stroke: "var(--color-line)" }}
              minTickGap={36}
            />
            <YAxis
              tickFormatter={(value: number) => compact.format(value)}
              tick={{ fontSize: 11, fill: "var(--color-ink-3)" }}
              tickLine={false}
              axisLine={false}
              width={64}
            />
            <Tooltip
              labelFormatter={(value) => formatMonth(String(value).slice(0, 7), locale)}
              formatter={(value, name) => [
                formatCurrency(Number(value), currency, locale),
                String(name),
              ]}
              contentStyle={{
                background: "var(--color-surface)",
                borderRadius: 8,
                border: "1px solid var(--color-line)",
                fontSize: 12,
                color: "var(--color-ink)",
              }}
            />
            <Area
              type="monotone"
              dataKey="optimistic"
              name={t("optimistic")}
              stroke="none"
              fill="var(--color-accent)"
              fillOpacity={0.08}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="conservative"
              name={t("conservative")}
              stroke="none"
              fill="var(--color-surface)"
              fillOpacity={1}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="base"
              name={t("baseProjection")}
              stroke="var(--color-accent)"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              dot={false}
              connectNulls
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="actual"
              name={t("actual")}
              stroke="var(--color-accent)"
              strokeWidth={2.5}
              dot={false}
              connectNulls
              isAnimationActive={false}
            />
            {targets.map((goal) => (
              <ReferenceDot
                key={`${goal.name}-${goal.targetDate}`}
                x={goal.targetDate ?? undefined}
                y={goal.target}
                r={4}
                fill="var(--color-warning)"
                stroke="var(--color-surface)"
                strokeWidth={2}
                ifOverflow="extendDomain"
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      {targets.length > 0 ? (
        <p className="mt-2 text-xs text-ink-3">
          {t("targetMarkers", { count: targets.length })}
        </p>
      ) : null}
    </figure>
  );
}
