"use client";

import { useLocale } from "next-intl";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { CategoryIcon } from "@/components/category-icon";
import { CHART_COLORS } from "@/lib/chart-colors";
import { formatCurrency } from "@/lib/format";

type CategoryChild = {
  name: string;
  total: number;
  color?: string | null;
  icon?: string | null;
};

type CategorySlice = CategoryChild & {
  children?: CategoryChild[];
};

export function SpendingChart({
  data,
  currency,
}: {
  data: CategorySlice[];
  currency: string;
}) {
  const locale = useLocale();

  if (data.length === 0) {
    return <div className="flex h-64 items-center justify-center text-sm text-ink-3">—</div>;
  }

  const total = data.reduce((sum, item) => sum + item.total, 0);
  const colorFor = (item: CategorySlice, index: number) =>
    item.color || CHART_COLORS[index % CHART_COLORS.length];

  return (
    <div className="grid gap-5 sm:grid-cols-[220px_minmax(0,1fr)] sm:items-center">
      <div className="mx-auto h-56 w-56 max-w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="total"
              nameKey="name"
              innerRadius={54}
              outerRadius={84}
              paddingAngle={2}
              stroke="var(--color-surface)"
              strokeWidth={2}
              isAnimationActive={false}
            >
              {data.map((item, index) => (
                <Cell key={item.name} fill={colorFor(item, index)} />
              ))}
            </Pie>
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
          </PieChart>
        </ResponsiveContainer>
      </div>

      <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
        {data.map((item, index) => {
          const share = total > 0 ? (item.total / total) * 100 : 0;
          return (
            <li key={item.name}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: colorFor(item, index) }}
                  />
                  <CategoryIcon name={item.name} icon={item.icon} color={item.color} />
                  <span className="truncate text-ink-2">{item.name}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-medium text-ink">
                    {formatCurrency(item.total, currency, locale)}
                  </span>
                  <span className="text-xs text-ink-3">
                    {new Intl.NumberFormat(locale === "en" ? "en-US" : "pt-BR", {
                      maximumFractionDigits: 1,
                    }).format(share)}
                    %
                  </span>
                </span>
              </div>
              {item.children && item.children.length > 0 ? (
                <ul className="ml-5 mt-1 space-y-1 border-l border-line/70 pl-3">
                  {item.children.map((child) => (
                    <li
                      key={child.name}
                      className="flex items-center justify-between gap-3 text-xs text-ink-3"
                    >
                      <span className="truncate">{child.name}</span>
                      <span className="shrink-0">{formatCurrency(child.total, currency, locale)}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
