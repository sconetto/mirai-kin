"use client";

import { useTranslations } from "next-intl";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency, intlLocale } from "@/lib/format";
import type { MonthlySpending } from "@/services/dashboard-charts";

export function MonthlySpendingChart({
  data,
  currency,
  locale,
}: {
  data: MonthlySpending;
  currency: string;
  locale: string;
}) {
  const t = useTranslations("dashboard");

  if (data.points.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-ink-3">
        {t("spendingEmpty")}
      </div>
    );
  }

  const compact = new Intl.NumberFormat(intlLocale(locale), {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  });

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-3">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 bg-accent" /> {t("selectedMonth")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 border-t border-dashed border-ink-3" />{" "}
          {t("previousMonth")}
        </span>
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data.points} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" vertical={false} />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 11, fill: "var(--color-ink-3)" }}
              tickLine={false}
              axisLine={{ stroke: "var(--color-line)" }}
              minTickGap={28}
            />
            <YAxis
              tickFormatter={(value: number) => compact.format(value)}
              tick={{ fontSize: 11, fill: "var(--color-ink-3)" }}
              tickLine={false}
              axisLine={false}
              width={60}
            />
            <Tooltip
              labelFormatter={(value) => t("day", { day: Number(value) })}
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
            <Line
              type="monotone"
              dataKey="previous"
              name={t("previousMonth")}
              stroke="var(--color-ink-3)"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="selected"
              name={t("selectedMonth")}
              stroke="var(--color-accent)"
              strokeWidth={2.5}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
