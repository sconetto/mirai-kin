"use client";

import { Sankey, ResponsiveContainer, Tooltip } from "recharts";
import type { SankeyNodeProps } from "recharts";
import { useTranslations } from "next-intl";
import { localizedCategoryName } from "@/lib/category-name";
import { formatCurrency, intlLocale } from "@/lib/format";
import type { MonthlyCashflow } from "@/services/dashboard-charts";

const SOURCE_COLORS = ["var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];
const OUTCOME_COLORS = [
  "var(--chart-7)",
  "var(--chart-8)",
  "var(--chart-9)",
  "var(--chart-10)",
  "var(--chart-6)",
  "var(--chart-1)",
];

export function CashflowSankey({
  data,
  currency,
  locale,
}: {
  data: MonthlyCashflow;
  currency: string;
  locale: string;
}) {
  const t = useTranslations("dashboard");
  const sources = data.incomeSources;
  const outcomes = data.outcomes;
  if (sources.length === 0 || outcomes.length === 0) {
    return (
      <div className="flex h-80 items-center justify-center text-sm text-ink-3">
        {t("cashflowEmpty")}
      </div>
    );
  }

  const nodes = [
    ...sources.map((item, index) => ({
      name: localizedCategoryName(item, locale),
      color: item.color ?? SOURCE_COLORS[index % SOURCE_COLORS.length],
    })),
    { name: t("cashflowHub"), color: "var(--color-accent)" },
    ...outcomes.map((item, index) => ({
      name: localizedCategoryName(item, locale),
      color: item.color ?? OUTCOME_COLORS[index % OUTCOME_COLORS.length],
    })),
  ];
  const hub = sources.length;
  const links = [
    ...sources.map((item, index) => ({ source: index, target: hub, value: item.total })),
    ...outcomes.map((item, index) => ({
      source: hub,
      target: hub + 1 + index,
      value: item.total,
    })),
  ];

  const renderNode = ({ x, y, width, height, payload, index }: SankeyNodeProps) => {
    const isSource = payload.depth === 0;
    const isHub = payload.depth === 1;
    const label = payload.name.length > 19 ? `${payload.name.slice(0, 18)}…` : payload.name;
    const textX = isSource ? x - 8 : x + width + 8;
    const textY = y + height / 2;
    const color = isHub
      ? "var(--color-accent)"
      : (nodes[index]?.color ?? "var(--color-accent)");
    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          rx={3}
          fill={color}
          fillOpacity={isHub ? 1 : 0.9}
        />
        <text
          x={textX}
          y={textY - 7}
          textAnchor={isSource ? "end" : "start"}
          fill="var(--color-ink-2)"
          fontSize={11}
          fontWeight={500}
        >
          {label}
        </text>
        <text
          x={textX}
          y={textY + 8}
          textAnchor={isSource ? "end" : "start"}
          fill="var(--color-ink-3)"
          fontSize={10}
        >
          {formatCurrency(Number(payload.value), currency, locale)}
        </text>
      </g>
    );
  };

  return (
    <div className="h-96 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <Sankey
          data={{ nodes, links }}
          node={renderNode}
          link={{ fill: "var(--color-accent)", fillOpacity: 0.12 }}
          nodeWidth={10}
          nodePadding={22}
          margin={{ top: 10, right: 112, bottom: 10, left: 112 }}
          iterations={32}
        >
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
        </Sankey>
      </ResponsiveContainer>
      <p className="sr-only">
        {new Intl.NumberFormat(intlLocale(locale), {
          style: "currency",
          currency,
          maximumFractionDigits: 0,
        }).format(data.income)}{" "}
        income, {formatCurrency(data.expenses, currency, locale)} spending
      </p>
    </div>
  );
}
