"use client";

import { useTranslations } from "next-intl";
import { formatCurrency, formatDate } from "@/lib/format";
import type { DashboardMovement } from "@/services/dashboard";

export function MovementWaterfall({
  movement,
  currency,
  locale,
}: {
  movement: DashboardMovement;
  currency: string;
  locale: string;
}) {
  const t = useTranslations("dashboard");
  const flows = [
    {
      key: "opening",
      label: t("opening"),
      start: 0,
      end: movement.opening,
      value: movement.opening,
      tone: "base",
    },
    {
      key: "income",
      label: t("income"),
      start: movement.opening,
      end: movement.opening + movement.income,
      value: movement.income,
      tone: "positive",
    },
    {
      key: "spending",
      label: t("spending"),
      start: movement.opening + movement.income,
      end: movement.opening + movement.income - movement.expenses,
      value: -movement.expenses,
      tone: "negative",
    },
    {
      key: "market",
      label: t("marketOther"),
      start: movement.opening + movement.income - movement.expenses,
      end: movement.closing,
      value: movement.marketOther,
      tone: movement.marketOther >= 0 ? "positive" : "negative",
    },
    {
      key: "closing",
      label: t("closing"),
      start: 0,
      end: movement.closing,
      value: movement.closing,
      tone: "base",
    },
  ];
  const values = flows.flatMap((flow) => [flow.start, flow.end, 0]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  return (
    <div>
      <p className="text-xs text-ink-3">
        {formatDate(movement.from, locale)} → {formatDate(movement.to, locale)}
      </p>
      <ol className="mt-3 space-y-2" aria-label={t("movement")}>
        {flows.map((flow) => {
          const left = ((Math.min(flow.start, flow.end) - min) / span) * 100;
          const width = (Math.abs(flow.end - flow.start) / span) * 100;
          return (
            <li key={flow.key} className="grid grid-cols-[7rem_minmax(0,1fr)_7rem] items-center gap-2">
              <span className="text-xs text-ink-3">{flow.label}</span>
              <span className="h-5 rounded-sm bg-paper">
                <span
                  className={`block h-full rounded-sm ${
                    flow.tone === "positive"
                      ? "bg-accent"
                      : flow.tone === "negative"
                        ? "bg-negative"
                        : "bg-ink-3/50"
                  }`}
                  style={{ marginLeft: `${left}%`, width: `${Math.max(0.8, width)}%` }}
                />
              </span>
              <span
                className={`tabular text-right text-xs font-medium ${
                  flow.tone === "positive"
                    ? "text-positive"
                    : flow.tone === "negative"
                      ? "text-negative"
                      : "text-ink-2"
                }`}
              >
                {flow.value > 0 ? "+" : ""}
                {formatCurrency(flow.value, currency, locale)}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-xs text-ink-3">
        {t("movementSummary", {
          change: formatCurrency(movement.change, currency, locale),
        })}
      </p>
    </div>
  );
}
