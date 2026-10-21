"use client";

import { useTranslations } from "next-intl";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Link } from "@/i18n/navigation";
import { formatCurrency, intlLocale } from "@/lib/format";

type BalanceDatum = {
  id: string;
  name: string;
  total: number;
  type: string;
  ownershipType: string;
  assetSubtype: string | null;
};

const TYPE_COLORS: Record<string, string> = {
  checking: "var(--chart-1)",
  savings: "var(--chart-2)",
  credit_card: "var(--negative)",
  investment: "var(--chart-3)",
  loan: "var(--chart-4)",
  mortgage: "var(--chart-7)",
  asset: "var(--chart-6)",
  cash: "var(--chart-9)",
};

export function BalanceChart({
  data,
  locale,
  currency,
}: {
  data: BalanceDatum[];
  locale: string;
  currency: string;
}) {
  const t = useTranslations("accounts");
  const te = useTranslations("enums");

  const sorted = [...data].sort(
    (a, b) => b.total - a.total || a.name.localeCompare(b.name, intlLocale(locale)),
  );
  const total = sorted.reduce((sum, item) => sum + item.total, 0);
  const assets = sorted.reduce((sum, item) => sum + Math.max(0, item.total), 0);
  const liabilities = sorted.reduce((sum, item) => sum + Math.max(0, -item.total), 0);
  const typeOrder = [...new Set(sorted.map((item) => item.type))];
  const maxAbs = Math.max(...sorted.map((item) => Math.abs(item.total)), 1);

  const compact = new Intl.NumberFormat(intlLocale(locale), {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  });

  if (sorted.length === 0) {
    return (
      <div className="flex min-h-52 flex-col items-center justify-center gap-2 text-center">
        <p className="text-sm text-ink-2">{t("chartEmpty")}</p>
        <Link
          href="/accounts"
          className="text-sm font-medium text-accent underline-offset-4 hover:underline"
        >
          {t("clearFilters")}
        </Link>
      </div>
    );
  }

  return (
    <div>
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line/70 bg-line/70 sm:grid-cols-4">
        <div className="bg-surface px-4 py-3">
          <dt className="text-xs text-ink-3">{t("chartTotal")}</dt>
          <dd
            className={`tabular mt-1 text-xl font-semibold ${
              total >= 0 ? "text-ink" : "text-negative"
            }`}
          >
            {formatCurrency(total, currency, locale)}
          </dd>
        </div>
        <div className="bg-surface px-4 py-3">
          <dt className="text-xs text-ink-3">{t("chartAssets")}</dt>
          <dd className="tabular mt-1 text-base font-semibold text-positive">
            {formatCurrency(assets, currency, locale)}
          </dd>
        </div>
        <div className="bg-surface px-4 py-3">
          <dt className="text-xs text-ink-3">{t("chartLiabilities")}</dt>
          <dd className="tabular mt-1 text-base font-semibold text-negative">
            {formatCurrency(liabilities, currency, locale)}
          </dd>
        </div>
        <div className="bg-surface px-4 py-3">
          <dt className="text-xs text-ink-3">{t("chartAccounts")}</dt>
          <dd className="tabular mt-1 text-base font-semibold text-ink">{sorted.length}</dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        {typeOrder.map((type) => (
          <span key={type} className="flex items-center gap-1.5 text-xs text-ink-3">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: TYPE_COLORS[type] ?? "var(--color-accent)" }}
            />
            {te(`accountType.${type}` as never)}
          </span>
        ))}
      </div>

      <div className="mt-3 hidden max-h-[560px] overflow-y-auto pr-1 sm:block">
        <div style={{ height: Math.max(240, sorted.length * 36) }} className="w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={sorted}
              layout="vertical"
              margin={{ top: 4, right: 76, bottom: 4, left: 64 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" horizontal={false} />
              <XAxis
                type="number"
                tickFormatter={(value: number) => compact.format(value)}
                tick={{ fontSize: 11, fill: "var(--color-ink-3)" }}
                tickLine={false}
                axisLine={{ stroke: "var(--color-line)" }}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={170}
                tickFormatter={(value: string) =>
                  value.length > 23 ? `${value.slice(0, 22)}…` : value
                }
                tick={{ fontSize: 11, fill: "var(--color-ink-3)" }}
                tickLine={false}
                axisLine={false}
              />
              <ReferenceLine x={0} stroke="var(--color-line)" />
              <Tooltip
                cursor={{ fill: "var(--color-paper)" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const item = payload[0].payload as BalanceDatum;
                  return (
                    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-lg">
                      <p className="font-medium text-ink">{item.name}</p>
                      <p className="mt-0.5 text-ink-3">
                        {te(`accountType.${item.type}` as never)} ·{" "}
                        {item.ownershipType === "company"
                          ? t("ownershipCompany")
                          : t("ownershipPersonal")}
                        {item.assetSubtype
                          ? ` · ${t(`assetSubtypeLabels.${item.assetSubtype}` as never)}`
                          : ""}
                      </p>
                      <p className="tabular mt-1 font-semibold text-ink">
                        {formatCurrency(item.total, currency, locale)}
                      </p>
                    </div>
                  );
                }}
              />
              <Bar
                dataKey="total"
                barSize={18}
                radius={4}
                minPointSize={2}
                background={{ fill: "var(--color-paper)", radius: 4 }}
                isAnimationActive={false}
              >
                {sorted.map((item) => (
                  <Cell
                    key={item.id}
                    fill={
                      item.total === 0
                        ? "var(--color-line)"
                        : (TYPE_COLORS[item.type] ?? "var(--color-accent)")
                    }
                  />
                ))}
                <LabelList
                  dataKey="total"
                  content={(props) => {
                    const { x, y, width, height, value } = props as {
                      x?: number;
                      y?: number;
                      width?: number;
                      height?: number;
                      value?: number | string;
                    };
                    const numeric = Number(value ?? 0);
                    const left = Number(x ?? 0);
                    const top = Number(y ?? 0);
                    const barWidth = Number(width ?? 0);
                    const barHeight = Number(height ?? 0);
                    return (
                      <text
                        x={
                          numeric < 0
                            ? left + Math.min(0, barWidth) - 8
                            : left + Math.max(0, barWidth) + 8
                        }
                        y={top + barHeight / 2}
                        textAnchor={numeric < 0 ? "end" : "start"}
                        dominantBaseline="middle"
                        fill="var(--color-ink-2)"
                        fontSize={11}
                      >
                        {compact.format(numeric)}
                      </text>
                    );
                  }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <ul className="mt-3 divide-y divide-line/70 sm:hidden">
        {sorted.map((item) => (
          <li key={item.id} className="py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{item.name}</p>
                <p className="mt-0.5 text-xs text-ink-3">
                  {te(`accountType.${item.type}` as never)} ·{" "}
                  {item.ownershipType === "company"
                    ? t("ownershipCompany")
                    : t("ownershipPersonal")}
                  {item.assetSubtype
                    ? ` · ${t(`assetSubtypeLabels.${item.assetSubtype}` as never)}`
                    : ""}
                </p>
              </div>
              <p
                className={`tabular shrink-0 text-sm font-semibold ${
                  item.total < 0 ? "text-negative" : "text-ink"
                }`}
              >
                {formatCurrency(item.total, currency, locale)}
              </p>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-paper">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.max(2, (Math.abs(item.total) / maxAbs) * 100)}%`,
                  background:
                    item.total === 0
                      ? "var(--color-line)"
                      : item.total < 0
                        ? "var(--negative)"
                        : (TYPE_COLORS[item.type] ?? "var(--color-accent)"),
                }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
