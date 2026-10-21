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
import { useTranslations } from "next-intl";
import { formatCurrency, formatMonth, intlLocale } from "@/lib/format";
import type { DashboardPace } from "@/services/dashboard";

export function ContributionPaceChart({
  pace,
  currency,
  locale,
}: {
  pace: DashboardPace;
  currency: string;
  locale: string;
}) {
  const t = useTranslations("dashboard");
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
          <span className="h-0.5 w-4 bg-accent" /> {t("actual")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 border-t border-dashed border-ink-3" /> {t("required")}
        </span>
      </div>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={pace.points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" vertical={false} />
            <XAxis
              dataKey="month"
              tickFormatter={(value: string) => formatMonth(value, locale)}
              tick={{ fontSize: 11, fill: "var(--color-ink-3)" }}
              tickLine={false}
              axisLine={{ stroke: "var(--color-line)" }}
              minTickGap={24}
            />
            <YAxis
              tickFormatter={(value: number) => compact.format(value)}
              tick={{ fontSize: 11, fill: "var(--color-ink-3)" }}
              tickLine={false}
              axisLine={false}
              width={64}
            />
            <Tooltip
              labelFormatter={(value) => formatMonth(String(value), locale)}
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
              dataKey="actual"
              name={t("actual")}
              stroke="var(--color-accent)"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="required"
              name={t("required")}
              stroke="var(--color-ink-3)"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs text-ink-3">
        {pace.shortfall > 0
          ? t("paceShortfall", {
              amount: formatCurrency(pace.shortfall, currency, locale),
            })
          : t("paceSurplus", {
              amount: formatCurrency(pace.surplus, currency, locale),
            })}
      </p>
    </div>
  );
}
