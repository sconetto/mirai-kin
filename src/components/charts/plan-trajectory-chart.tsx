"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatCurrency, formatDate, formatMonth, formatNumber, intlLocale } from "@/lib/format";
import type { PlanTrajectoryAssumptions } from "@/services/projections";

type Point = {
  date: string;
  actual: number | null;
  conservative: number | null;
  base: number | null;
  optimistic: number | null;
};

type Target = {
  id: string;
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
  today,
  assumptions,
}: {
  data: Point[];
  goals: Target[];
  currency: string;
  locale: string;
  today: string;
  assumptions: PlanTrajectoryAssumptions;
}) {
  const t = useTranslations("dashboard");
  const tp = useTranslations("planner");

  if (data.length === 0) {
    return <div className="flex h-64 items-center justify-center text-sm text-ink-3">{t("noHistory")}</div>;
  }

  const compact = new Intl.NumberFormat(intlLocale(locale), {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  });
  const values = data
    .flatMap((point) => [point.actual, point.conservative, point.base, point.optimistic])
    .filter((value): value is number => value !== null);
  if (values.length === 0) {
    return <div className="flex h-64 items-center justify-center text-sm text-ink-3">{t("noHistory")}</div>;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const padding = Math.max((max - min) * 0.08, Math.abs(max) * 0.015, 1);
  const domain: [number, number] = [min - padding, max + padding];
  const current = data.find((point) => point.date === today)?.actual ?? null;

  return (
    <figure className="w-full">
      <figcaption className="sr-only">
        {t("trajectorySummary", {
          current: formatCurrency(current ?? 0, currency, locale),
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
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-accent" /> {t("today")}
        </span>
      </div>
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 18, right: 16, bottom: 4, left: 0 }}>
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
              domain={domain}
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
              dot={data.filter((point) => point.actual !== null).length <= 12
                ? { r: 2.5, fill: "var(--color-accent)" }
                : false}
              connectNulls
              isAnimationActive={false}
            />
            <ReferenceLine
              x={today}
              stroke="var(--color-line)"
              strokeDasharray="2 4"
              ifOverflow="extendDomain"
            />
            {current !== null ? (
              <ReferenceDot
                x={today}
                y={current}
                r={4}
                fill="var(--color-accent)"
                stroke="var(--color-surface)"
                strokeWidth={2}
                ifOverflow="extendDomain"
                label={{
                  value: t("today"),
                  position: "top",
                  fill: "var(--color-ink-3)",
                  fontSize: 10,
                }}
              />
            ) : null}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-ink-3 sm:grid-cols-3">
        {(
          [
            ["cash", assumptions.assetClassRates.cash],
            ["investments", assumptions.assetClassRates.investments],
            ["realEstate", assumptions.assetClassRates.real_estate],
            ["vehicles", assumptions.assetClassRates.vehicles],
            ["otherAssets", assumptions.assetClassRates.other_appreciating],
            ["liabilities", assumptions.assetClassRates.liabilities],
          ] as const
        ).map(([key, rate]) => (
          <span key={key}>
            {t(key)}: {formatNumber(rate * 100, locale)}%
          </span>
        ))}
      </div>
      {goals.length > 0 ? (
        <div className="mt-4 border-t border-line/70 pt-3">
          <p className="text-xs font-medium text-ink-3">{t("goalRail")}</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {goals.map((goal) => (
              <Link
                key={goal.id}
                href="/planner"
                className="rounded-lg border border-line/70 bg-paper px-3 py-2 text-xs hover:border-accent/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium text-ink">{goal.name}</span>
                  <span className="text-ink-3">{tp(`status.${goal.status}` as never)}</span>
                </div>
                <p className="mt-1 text-ink-3">
                  {formatCurrency(goal.target, currency, locale)} ·{" "}
                  {goal.targetDate ? formatDate(goal.targetDate, locale) : "—"}
                </p>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </figure>
  );
}
