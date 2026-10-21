import { formatCurrency, formatDate, formatMonth, formatNumber } from "./format";
import type { Insight } from "@/services/insights";

export function insightParams(
  insight: Insight,
  locale: string,
  baseCurrency: string,
): Record<string, string> {
  const data = insight.data;
  switch (insight.type) {
    case "savings_rate":
      return {
        month: formatMonth(String(data.month), locale),
        rate: formatNumber(String(data.rate), locale),
      };
    case "budget_over":
      return {
        name: String(data.name),
        surplus: formatCurrency(
          String(data.surplus),
          String(data.currency ?? baseCurrency),
          locale,
        ),
      };
    case "budget_near":
      return { name: String(data.name), percent: formatNumber(String(data.percent), locale) };
    case "category_spike":
      return {
        name: String(locale === "en" ? (data.nameEn ?? data.name) : (data.namePt ?? data.name)),
        ratio: formatNumber(String(data.ratio), locale),
      };
    case "upcoming_bill":
      return {
        label: String(data.label),
        nextExpected: formatDate(String(data.nextExpected), locale),
        amount: formatCurrency(String(data.amount), baseCurrency, locale),
      };
    case "debt_burden":
      return { ratio: formatNumber(String(data.ratio), locale) };
    case "allocation_concentration":
      return { symbol: String(data.symbol), share: formatNumber(String(data.share), locale) };
    case "net_worth_trend":
      return { changePct: formatNumber(String(data.changePct), locale) };
    case "cashflow_risk":
      return {
        month: formatMonth(String(data.month), locale),
        net: formatCurrency(String(data.net), String(data.currency ?? baseCurrency), locale),
      };
    case "goal_at_risk":
    case "goal_off_track":
      return {
        name: String(data.name),
        gap: formatCurrency(String(data.gap), String(data.currency ?? baseCurrency), locale),
        requiredMonthly: formatCurrency(
          String(data.requiredMonthly ?? 0),
          String(data.currency ?? baseCurrency),
          locale,
        ),
        targetDate: data.targetDate ? formatDate(String(data.targetDate), locale) : "—",
      };
    default:
      return { type: insight.type };
  }
}
