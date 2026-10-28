"use client";

import { useId } from "react";
import { Sankey, ResponsiveContainer, Tooltip } from "recharts";
import type { SankeyLinkProps, SankeyNodeProps } from "recharts";
import { useTranslations } from "next-intl";
import { buildCashflowGraph } from "@/lib/cashflow-graph";
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

  const graph = buildCashflowGraph(
    data,
    { hub: t("cashflowHub"), direct: t("cashflowDirect") },
    (category) => localizedCategoryName(category, locale),
  );
  const { nodes, links } = graph;
  const chartHeight = Math.max(480, 140 + nodes.length * 30);

  const renderNode = ({ x, y, width, height, payload, index }: SankeyNodeProps) => {
    const node = nodes[index];
    const isSource = node?.kind === "income";
    const isHub = node?.kind === "hub";
    const isChild = node?.kind === "child";
    const isParentLike = node?.kind === "parent" || node?.kind === "outcome";
    const compact = !isHub && height < 30;
    const maxLabelLength = compact ? 18 : 24;
    const label = payload.name.length > maxLabelLength
      ? `${payload.name.slice(0, maxLabelLength - 1)}…`
      : payload.name;
    const textAnchor = isSource
      ? "end"
      : isHub
        ? "middle"
        : isChild
          ? "start"
          : "end";
    const textX = isHub
      ? x + width / 2
      : isSource || isParentLike
        ? x - 9
        : x + width + 9;
    const textY = isHub ? y - 18 : y + height / 2;
    const color = node?.color ?? "var(--color-accent)";
    const amount = formatCurrency(Number(payload.value), currency, locale);
    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          rx={3}
          fill={color}
          fillOpacity={isHub ? 1 : isChild ? 0.72 : 0.92}
        />
        {compact ? (
          <text
            x={textX}
            y={textY + 3}
            textAnchor={textAnchor}
            fill="var(--color-ink-2)"
            fontSize={10}
          >
            {`${label} · ${amount}`}
          </text>
        ) : (
          <>
            <text
              x={textX}
              y={isHub ? textY : textY - 7}
              textAnchor={textAnchor}
              fill="var(--color-ink-2)"
              fontSize={11}
              fontWeight={500}
            >
              {label}
            </text>
            <text
              x={textX}
              y={isHub ? textY + 12 : textY + 8}
              textAnchor={textAnchor}
              fill="var(--color-ink-3)"
              fontSize={10}
            >
              {amount}
            </text>
          </>
        )}
      </g>
    );
  };

  const renderLink = (props: SankeyLinkProps) => {
    const incoming = props.payload.source.depth === 0;
    return (
      <path
        d={`M${props.sourceX},${props.sourceY} C${props.sourceControlX},${props.sourceY} ${props.targetControlX},${props.targetY} ${props.targetX},${props.targetY}`}
        fill="none"
        stroke={`url(#${incoming ? inflowGradient : outflowGradient})`}
        strokeWidth={props.linkWidth}
        strokeOpacity={0.5}
        strokeLinecap="butt"
      />
    );
  };

  const parentSummaries = nodes
    .filter((node) => node.kind === "parent" || node.kind === "outcome")
    .slice(0, 3)
    .map((parent) => {
      const children = nodes
        .filter((node) => node.kind === "child" && node.parentId === parent.id)
        .slice(0, 4)
        .map((child) => child.name);
      return children.length > 0 ? `${parent.name}: ${children.join(", ")}` : parent.name;
    });

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[46rem]" style={{ height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <Sankey
            data={{ nodes, links }}
            node={renderNode}
            link={renderLink}
            nodeWidth={12}
            nodePadding={18}
            margin={{ top: 28, right: 200, bottom: 14, left: 190 }}
            iterations={32}
            sort={false}
            align="left"
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
              formatter={(value, name, item) => {
                const payload = item?.payload as
                  | { source?: number; target?: number }
                  | undefined;
                if (
                  typeof payload?.source === "number" &&
                  typeof payload?.target === "number"
                ) {
                  const source = nodes[payload.source]?.name ?? "";
                  const target = nodes[payload.target]?.name ?? "";
                  return [
                    formatCurrency(Number(value), currency, locale),
                    `${source} → ${target}`,
                  ];
                }
                return [formatCurrency(Number(value), currency, locale), String(name ?? "")];
              }}
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
          income, {formatCurrency(data.expenses, currency, locale)} spending.
          {parentSummaries.length > 0 ? ` ${parentSummaries.join("; ")}.` : ""}
        </p>
      </div>
    </div>
  );
}
