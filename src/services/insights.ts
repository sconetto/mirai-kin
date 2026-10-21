import { createHash } from "node:crypto";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  categories,
  debts,
  debtSchedule,
  insightAcknowledgements,
  transactions,
} from "@/db/schema";
import { getBaseCurrency } from "./settings";
import { listBudgetsWithSpend } from "./budgets";
import { getNetWorthSeries } from "./equity";
import { resolveRate } from "./fx";
import { listPositionsWithValue } from "./investments";
import { getPlanStatus } from "./planner";
import { forecast } from "./projections";
import { listRecurringDetections, syncRecurringDetections } from "./detections";

export type InsightSeverity = "info" | "warning" | "critical";

export type InsightType =
  | "savings_rate"
  | "budget_over"
  | "budget_near"
  | "category_spike"
  | "upcoming_bill"
  | "debt_burden"
  | "allocation_concentration"
  | "net_worth_trend"
  | "cashflow_risk"
  | "goal_at_risk"
  | "goal_off_track";

export type Insight = {
  type: InsightType;
  severity: InsightSeverity;
  signature: string;
  data: Record<string, string | number | boolean | null>;
  action?: { href: string };
};

function signature(type: InsightType, key: string): string {
  return createHash("sha256").update(`${type}:${key}`).digest("hex").slice(0, 16);
}

function monthBounds(date: Date) {
  return {
    start: new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)),
    end: new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59, 999)),
    startDate: new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
      .toISOString()
      .slice(0, 10),
    endDate: new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0))
      .toISOString()
      .slice(0, 10),
    key: new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)).toISOString().slice(0, 7),
  };
}

async function rateOrOne(from: string, to: string, date: Date): Promise<number> {
  if (from === to) return 1;
  try {
    const { rate } = await resolveRate(from, to, date);
    return Number(rate);
  } catch {
    return 1;
  }
}

export async function getInsights(now = new Date()): Promise<Insight[]> {
  const db = getDb();
  const baseCurrency = await getBaseCurrency();
  const { start, end, startDate, endDate, key: monthKey } = monthBounds(now);
  const insights: Insight[] = [];

  // Savings rate for the current month.
  const [monthAgg] = await db
    .select({
      income: sql<string>`coalesce(sum(case when ${transactions.amount} > 0 and (${transactions.paymentType} is null or ${transactions.paymentType} <> 'transfer') then ${transactions.baseAmount} else 0 end), 0)`,
      expenses: sql<string>`coalesce(sum(case when ${transactions.amount} < 0 and (${transactions.paymentType} is null or ${transactions.paymentType} <> 'transfer') then -${transactions.baseAmount} else 0 end), 0)`,
    })
    .from(transactions)
    .where(
      and(
        gte(transactions.recordDate, start),
        lte(transactions.recordDate, end),
        sql`${transactions.reviewStatus} <> 'split'`,
      ),
    );

  const income = Number(monthAgg?.income ?? 0);
  const expenses = Number(monthAgg?.expenses ?? 0);
  const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;

  if (income > 0) {
    insights.push({
      type: "savings_rate",
      severity: savingsRate < 0 ? "critical" : savingsRate < 10 ? "warning" : "info",
      signature: signature("savings_rate", monthKey),
      data: {
        month: monthKey,
        rate: Number(savingsRate.toFixed(2)),
        income: Number(income.toFixed(2)),
        expenses: Number(expenses.toFixed(2)),
      },
      action: { href: "/spending/reports" },
    });
  }

  // Budget variance.
  const budgets = await listBudgetsWithSpend();
  for (const budget of budgets) {
    const amount = Number(budget.amount);
    const spend = Number(budget.spend);
    if (amount <= 0) continue;
    if (budget.overBudget) {
      insights.push({
        type: "budget_over",
        severity: "critical",
        signature: signature("budget_over", budget.id),
        data: {
          budgetId: budget.id,
          name: budget.name,
          spend: Number(spend.toFixed(2)),
          amount: Number(amount.toFixed(2)),
          surplus: Number((spend - amount).toFixed(2)),
          currency: budget.currency,
        },
        action: { href: "/spending/budgets" },
      });
    } else if (spend / amount >= 0.85) {
      insights.push({
        type: "budget_near",
        severity: "warning",
        signature: signature("budget_near", budget.id),
        data: {
          budgetId: budget.id,
          name: budget.name,
          spend: Number(spend.toFixed(2)),
          amount: Number(amount.toFixed(2)),
          percent: Number(((spend / amount) * 100).toFixed(2)),
          currency: budget.currency,
        },
        action: { href: "/spending/budgets" },
      });
    }
  }

  // Category spending spikes vs the trailing three-month average.
  const trailingStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 3, 1));
  const categoryRows = await db
    .select({
      categoryId: categories.id,
      name: categories.name,
      nameEn: categories.nameEn,
      namePt: categories.namePt,
      month: sql<string>`to_char(${transactions.recordDate} at time zone 'UTC', 'YYYY-MM')`,
      total: sql<string>`coalesce(sum(-${transactions.baseAmount}), 0)`,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(
      and(
        gte(transactions.recordDate, trailingStart),
        lte(transactions.recordDate, end),
        sql`${transactions.amount} < 0`,
        sql`${transactions.reviewStatus} <> 'split'`,
      ),
    )
    .groupBy(
      categories.id,
      categories.name,
      categories.nameEn,
      categories.namePt,
      sql`to_char(${transactions.recordDate} at time zone 'UTC', 'YYYY-MM')`,
    );

  const byCategory = new Map<
    string,
    {
      name: string;
      nameEn: string | null;
      namePt: string | null;
      current: number;
      trailing: number[];
    }
  >();
  for (const row of categoryRows) {
    if (!row.categoryId) continue;
    const entry = byCategory.get(row.categoryId) ?? {
      name: row.name ?? "",
      nameEn: row.nameEn,
      namePt: row.namePt,
      current: 0,
      trailing: [],
    };
    if (row.month === monthKey) entry.current = Number(row.total);
    else entry.trailing.push(Number(row.total));
    byCategory.set(row.categoryId, entry);
  }

  for (const [categoryId, entry] of byCategory) {
    if (entry.trailing.length === 0) continue;
    const average = entry.trailing.reduce((sum, value) => sum + value, 0) / entry.trailing.length;
    if (average <= 0) continue;
    if (entry.current > average * 1.5) {
      insights.push({
        type: "category_spike",
        severity: "warning",
        signature: signature("category_spike", `${categoryId}:${monthKey}`),
        data: {
          categoryId,
          name: entry.name,
          nameEn: entry.nameEn,
          namePt: entry.namePt,
          current: Number(entry.current.toFixed(2)),
          average: Number(average.toFixed(2)),
          ratio: Number((entry.current / average).toFixed(2)),
          currency: baseCurrency,
        },
        action: { href: "/spending/reports" },
      });
    }
  }

  // Upcoming recurring bills.
  const today = now.toISOString().slice(0, 10);
  const horizon = new Date(now.getTime() + 30 * 86_400_000).toISOString().slice(0, 10);
  await syncRecurringDetections();
  for (const candidate of await listRecurringDetections()) {
    if (candidate.status === "ignored") continue;
    if (candidate.nextExpected < today || candidate.nextExpected > horizon) continue;
    insights.push({
      type: "upcoming_bill",
      severity:
        candidate.nextExpected <=
        new Date(now.getTime() + 7 * 86_400_000).toISOString().slice(0, 10)
          ? "warning"
          : "info",
      signature: signature("upcoming_bill", `${candidate.key}:${candidate.nextExpected}`),
      data: {
        label: candidate.label,
        amount: Number(candidate.averageAmount),
        cadence: candidate.cadence,
        nextExpected: candidate.nextExpected,
      },
      action: { href: "/spending/recurring" },
    });
  }

  // Debt burden for the current month.
  const debtRows = await db
    .select({ payment: debtSchedule.payment, currency: debts.currency })
    .from(debtSchedule)
    .innerJoin(debts, eq(debtSchedule.debtId, debts.id))
    .where(and(gte(debtSchedule.dueDate, startDate), lte(debtSchedule.dueDate, endDate)));

  let debtPayments = 0;
  for (const row of debtRows) {
    debtPayments += Number(row.payment) * (await rateOrOne(row.currency, baseCurrency, now));
  }
  if (income > 0 && debtPayments / income > 0.3) {
    insights.push({
      type: "debt_burden",
      severity: debtPayments / income > 0.5 ? "critical" : "warning",
      signature: signature("debt_burden", monthKey),
      data: {
        month: monthKey,
        payments: Number(debtPayments.toFixed(2)),
        income: Number(income.toFixed(2)),
        ratio: Number(((debtPayments / income) * 100).toFixed(2)),
        currency: baseCurrency,
      },
      action: { href: "/debts" },
    });
  }

  // Portfolio concentration.
  const positions = await listPositionsWithValue();
  const totalValue = positions.reduce((sum, position) => sum + Number(position.value), 0);
  if (totalValue > 0) {
    const largest = positions.reduce((max, position) =>
      Number(position.value) > Number(max.value) ? position : max,
    );
    const share = Number(largest.value) / totalValue;
    if (share > 0.4) {
      insights.push({
        type: "allocation_concentration",
        severity: share > 0.6 ? "warning" : "info",
        signature: signature("allocation_concentration", largest.symbol),
        data: {
          symbol: largest.symbol,
          share: Number((share * 100).toFixed(2)),
          value: Number(Number(largest.value).toFixed(2)),
          currency: largest.currency,
        },
        action: { href: "/invest" },
      });
    }
  }

  // Net-worth trend.
  const snapshots = await getNetWorthSeries();
  if (snapshots.length >= 2) {
    const latest = snapshots[snapshots.length - 1];
    const previous = snapshots[snapshots.length - 2];
    const changePct =
      Number(previous.net) === 0
        ? 0
        : ((Number(latest.net) - Number(previous.net)) / Math.abs(Number(previous.net))) * 100;
    insights.push({
      type: "net_worth_trend",
      severity: changePct <= -5 ? "warning" : "info",
      signature: signature("net_worth_trend", latest.date),
      data: {
        date: latest.date,
        net: Number(latest.net),
        changePct: Number(changePct.toFixed(2)),
        currency: latest.currency,
      },
      action: { href: "/equity" },
    });
  }

  // Cash-flow risk from the three-month forecast.
  const projection = await forecast(3);
  for (const month of projection.months) {
    if (month.net < 0) {
      insights.push({
        type: "cashflow_risk",
        severity: "warning",
        signature: signature("cashflow_risk", month.month),
        data: {
          month: month.month,
          net: Number(month.net.toFixed(2)),
          currency: projection.baseCurrency,
        },
        action: { href: "/forecast" },
      });
    }
  }

  // Goal trajectory risk.
  const plan = await getPlanStatus(now);
  for (const goal of plan.goals) {
    if (goal.status !== "at_risk" && goal.status !== "off_track") continue;
    const required = goal.requiredMonthly ?? 0;
    insights.push({
      type: goal.status === "at_risk" ? "goal_at_risk" : "goal_off_track",
      severity: goal.status === "at_risk" ? "warning" : "critical",
      signature: signature(
        goal.status === "at_risk" ? "goal_at_risk" : "goal_off_track",
        `${goal.id}:${goal.targetDate ?? "none"}:${goal.requiredMonthly ?? "none"}:${goal.status}`,
      ),
      data: {
        goalId: goal.id,
        name: goal.name,
        gap: goal.gap,
        requiredMonthly: required,
        targetDate: goal.targetDate,
        currency: goal.currency,
        status: goal.status,
      },
      action: { href: "/planner" },
    });
  }

  const acknowledged = await db.select().from(insightAcknowledgements);
  const hidden = new Set(acknowledged.map((row) => `${row.insightType}:${row.signature}`));
  return insights.filter((insight) => !hidden.has(`${insight.type}:${insight.signature}`));
}

export async function acknowledgeInsight(type: InsightType, signatureValue: string) {
  const db = getDb();
  await db
    .insert(insightAcknowledgements)
    .values({ insightType: type, signature: signatureValue })
    .onConflictDoNothing();
}
