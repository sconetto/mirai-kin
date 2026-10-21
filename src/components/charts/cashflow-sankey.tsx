"use client";

import { useId } from "react";
import { Sankey, ResponsiveContainer, Tooltip } from "recharts";
import type { SankeyLinkProps, SankeyNodeProps } from "recharts";
import { useTranslations } from "next-intl";
import { localizedCategoryName } from "@/lib/category-name";
import { formatCurrency, intlLocale } from "@/lib/format";
import type { MonthlyCashflow } from "@/services/dashboard-charts";

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
  const gradientBase = useId().replace(/:/g, "");
  const inflowGradient = `cashflow-in-${gradientBase}`;
  const outflowGradient = `cashflow-out-${gradientBase}`;
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
    ...sources.map((item) => ({
      name: localizedCategoryName(item, locale),
      color: item.id === "savings-draw" ? "var(--warning)" : "var(--positive)",
    })),
    { name: t("cashflowHub"), color: "var(--color-accent)" },
    ...outcomes.map((item) => ({
      name: localizedCategoryName(item, locale),
      color: item.id === "surplus" ? "var(--positive)" : "var(--negative)",
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
    const label = payload.name.length > 24 ? `${payload.name.slice(0, 23)}…` : payload.name;
    const textX = isSource ? x - 9 : x + width + 9;
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
          fillOpacity={isHub ? 1 : 0.92}
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

  const renderLink = (props: SankeyLinkProps) => {
    const outgoing = props.payload.source.depth === 1;
    return (
      <path
        d={`M${props.sourceX},${props.sourceY} C${props.sourceControlX},${props.sourceY} ${props.targetControlX},${props.targetY} ${props.targetX},${props.targetY}`}
        fill="none"
        stroke={`url(#${outgoing ? outflowGradient : inflowGradient})`}
        strokeWidth={props.linkWidth}
        strokeOpacity={0.5}
        strokeLinecap="round"
      />
    );
  };

  return (
    <div className="h-[26rem] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <Sankey
          data={{ nodes, links }}
          node={renderNode}
          link={renderLink}
          nodeWidth={12}
          nodePadding={24}
          margin={{ top: 14, right: 138, bottom: 14, left: 138 }}
          iterations={32}
        >
          <defs>
            <linearGradient id={inflowGradient} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--positive)" stopOpacity={0.65} />
              <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0.65} />
            </linearGradient>
            <linearGradient id={outflowGradient} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.65} />
              <stop offset="100%" stopColor="var(--negative)" stopOpacity={0.65} />
            </linearGradient>
          </defs>
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
