import { and, gte, lte, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { categories, transactions } from "@/db/schema";
import { getToday } from "./settings";

export type MonthlyCategory = {
  id: string;
  name: string;
  nameEn: string | null;
  namePt: string | null;
  total: number;
  color: string | null;
  icon: string | null;
  children: MonthlyCategory[];
};

export type MonthlyCashflow = {
  income: number;
  expenses: number;
  surplus: number;
  savingsDraw: number;
  incomeSources: MonthlyCategory[];
  expenseCategories: MonthlyCategory[];
  outcomes: MonthlyCategory[];
};

export type MonthlySpendingPoint = {
  day: number;
  selected: number;
  previous: number;
};

export type MonthlySpending = {
  month: string;
  previousMonth: string;
  selectedTotal: number;
  previousTotal: number;
  change: number;
  changePct: number | null;
  points: MonthlySpendingPoint[];
};

export type MonthlyInsights = {
  month: string;
  currentMonth: string;
  firstMonth: string;
  previousMonth: string;
  cashflow: MonthlyCashflow;
  spending: MonthlySpending;
};

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

function round4(value: number) {
  return Math.round(value * 10_000) / 10_000;
}

export function parseMonth(value: string | undefined, fallback: string): string {
  return value && MONTH_PATTERN.test(value) ? value : fallback;
}

export function shiftMonth(value: string, months: number): string {
  const [year, month] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1 + months, 1)).toISOString().slice(0, 7);
}

function monthBounds(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return {
    start: new Date(Date.UTC(year, monthNumber - 1, 1)),
    end: new Date(Date.UTC(year, monthNumber, 0, 23, 59, 59, 999)),
  };
}

function daysInMonth(month: string): number {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
}

function monthConditions(start: Date, end: Date) {
  return [
    gte(transactions.recordDate, start),
    lte(transactions.recordDate, end),
    sql`${transactions.reviewStatus} <> 'split'`,
    sql`${transactions.transferId} is null`,
    sql`(${transactions.paymentType} is null or ${transactions.paymentType} <> 'transfer')`,
  ];
}

function categoryDisplay(
  category: typeof categories.$inferSelect | undefined,
  fallback: { name: string; nameEn: string | null; namePt: string | null; id: string },
) {
  return {
    id: category?.id ?? fallback.id,
    name: category?.name ?? fallback.name,
    nameEn: category?.nameEn ?? fallback.nameEn,
    namePt: category?.namePt ?? fallback.namePt,
    color: category?.color ?? null,
    icon: category?.icon ?? null,
  };
}

function topLevelCategory(
  category: typeof categories.$inferSelect | undefined,
  byId: Map<string, typeof categories.$inferSelect>,
): typeof categories.$inferSelect | undefined {
  let current = category;
  const seen = new Set<string>();
  while (current?.parentId) {
    if (seen.has(current.id)) break;
    seen.add(current.id);
    const parent = byId.get(current.parentId);
    if (!parent) break;
    current = parent;
  }
  return current;
}

function capCategories(items: MonthlyCategory[], limit: number, fallback: MonthlyCategory): MonthlyCategory[] {
  if (items.length <= limit) return items;
  const kept = items.slice(0, limit);
  const rest = items.slice(limit);
  return [
    ...kept,
    {
      ...fallback,
      total: round4(rest.reduce((sum, item) => sum + item.total, 0)),
      children: rest,
    },
  ];
}

function buildCashflow(
  rows: { categoryId: string | null; income: string; expenses: string }[],
  incomeCategories: MonthlyCategory[],
  expenseCategories: MonthlyCategory[],
): MonthlyCashflow {
  const income = round4(rows.reduce((sum, row) => sum + Number(row.income), 0));
  const expenses = round4(rows.reduce((sum, row) => sum + Number(row.expenses), 0));
  const surplus = round4(Math.max(0, income - expenses));
  const savingsDraw = round4(Math.max(0, expenses - income));
  const sourceFallback: MonthlyCategory = {
    id: "other-income",
    name: "Other income",
    nameEn: "Other income",
    namePt: "Outras receitas",
    total: 0,
    color: null,
    icon: null,
    children: [],
  };
  const outcomeFallback: MonthlyCategory = {
    id: "other-expense",
    name: "Other",
    nameEn: "Other",
    namePt: "Outros",
    total: 0,
    color: null,
    icon: null,
    children: [],
  };
  const sources = [...incomeCategories].sort((a, b) => b.total - a.total);
  const outcomes = [...expenseCategories].sort((a, b) => b.total - a.total);
  if (savingsDraw > 0) {
    sources.push({
      id: "savings-draw",
      name: "From savings",
      nameEn: "From savings",
      namePt: "Dos investimentos",
      total: savingsDraw,
      color: "var(--chart-4)",
      icon: null,
      children: [],
    });
  }
  if (surplus > 0) {
    outcomes.push({
      id: "surplus",
      name: "Surplus",
      nameEn: "Surplus",
      namePt: "Sobra",
      total: surplus,
      color: "var(--chart-1)",
      icon: null,
      children: [],
    });
  }

  return {
    income,
    expenses,
    surplus,
    savingsDraw,
    incomeSources: capCategories(sources, 6, sourceFallback),
    expenseCategories: outcomes.filter((item) => item.id !== "surplus"),
    outcomes: capCategories(outcomes, 6, outcomeFallback),
  };
}

export async function getMonthlyInsights(monthInput?: string): Promise<MonthlyInsights> {
  const db = getDb();
  const today = await getToday();
  const currentMonth = today.slice(0, 7);
  const month = parseMonth(monthInput, currentMonth);
  const previousMonth = shiftMonth(month, -1);
  const selectedBounds = monthBounds(month);
  const previousBounds = monthBounds(previousMonth);

  const [rows, dailyRows, categoryRows, rangeRows] = await Promise.all([
    db
      .select({
        categoryId: transactions.categoryId,
        income: sql<string>`coalesce(sum(case when ${transactions.amount} > 0 then ${transactions.baseAmount} else 0 end), 0)`,
        expenses: sql<string>`coalesce(sum(case when ${transactions.amount} < 0 then -${transactions.baseAmount} else 0 end), 0)`,
      })
      .from(transactions)
      .where(and(...monthConditions(selectedBounds.start, selectedBounds.end)))
      .groupBy(transactions.categoryId),
    db
      .select({
        month: sql<string>`to_char(${transactions.recordDate} at time zone 'UTC', 'YYYY-MM')`,
        day: sql<string>`to_char(${transactions.recordDate} at time zone 'UTC', 'DD')`,
        expenses: sql<string>`coalesce(sum(case when ${transactions.amount} < 0 then -${transactions.baseAmount} else 0 end), 0)`,
      })
      .from(transactions)
      .where(and(...monthConditions(previousBounds.start, selectedBounds.end)))
      .groupBy(
        sql`to_char(${transactions.recordDate} at time zone 'UTC', 'YYYY-MM')`,
        sql`to_char(${transactions.recordDate} at time zone 'UTC', 'DD')`,
      ),
    db.select().from(categories),
    db
      .select({
        first: sql<string>`min(to_char(${transactions.recordDate} at time zone 'UTC', 'YYYY-MM'))`,
      })
      .from(transactions),
  ]);

  const categoryById = new Map(categoryRows.map((category) => [category.id, category]));
  const incomeSources: MonthlyCategory[] = [];
  const expenseById = new Map<string, MonthlyCategory>();
  const expenseChildren = new Map<string, Map<string, MonthlyCategory>>();

  for (const row of rows) {
    const category = row.categoryId ? categoryById.get(row.categoryId) : undefined;
    const income = Number(row.income);
    const expenses = Number(row.expenses);

    if (income > 0) {
      const display = categoryDisplay(category, {
        id: "uncategorized-income",
        name: "Other income",
        nameEn: "Other income",
        namePt: "Outras receitas",
      });
      incomeSources.push({ ...display, total: round4(income), children: [] });
    }

    if (expenses > 0) {
      const parent = topLevelCategory(category, categoryById);
      const parentDisplay = categoryDisplay(parent, {
        id: "uncategorized-expense",
        name: "Uncategorized",
        nameEn: "Uncategorized",
        namePt: "Sem categoria",
      });
      const parentNode =
        expenseById.get(parentDisplay.id) ?? {
          ...parentDisplay,
          total: 0,
          children: [],
        };
      parentNode.total = round4(parentNode.total + expenses);
      expenseById.set(parentDisplay.id, parentNode);

      if (category && parent && category.id !== parent.id) {
        const childDisplay = categoryDisplay(category, parentDisplay);
        const children = expenseChildren.get(parentDisplay.id) ?? new Map();
        const childNode =
          children.get(childDisplay.id) ?? { ...childDisplay, total: 0, children: [] };
        childNode.total = round4(childNode.total + expenses);
        children.set(childDisplay.id, childNode);
        expenseChildren.set(parentDisplay.id, children);
      }
    }
  }

  for (const [parentId, children] of expenseChildren) {
    const parent = expenseById.get(parentId);
    if (parent) parent.children = [...children.values()].sort((a, b) => b.total - a.total);
  }

  const expenseCategories = [...expenseById.values()].sort((a, b) => b.total - a.total);
  const cashflow = buildCashflow(rows, incomeSources, expenseCategories);

  const daily = new Map<string, Map<number, number>>();
  for (const row of dailyRows) {
    const bucket = daily.get(row.month) ?? new Map<number, number>();
    bucket.set(Number(row.day), Number(row.expenses));
    daily.set(row.month, bucket);
  }

  const selectedDays =
    month === currentMonth ? Number(today.slice(8, 10)) : daysInMonth(month);
  const previousDays = Math.min(selectedDays, daysInMonth(previousMonth));
  const selectedDaily = daily.get(month) ?? new Map<number, number>();
  const previousDaily = daily.get(previousMonth) ?? new Map<number, number>();
  const points: MonthlySpendingPoint[] = [];
  let selectedTotal = 0;
  let previousTotal = 0;
  for (let day = 1; day <= selectedDays; day += 1) {
    selectedTotal += selectedDaily.get(day) ?? 0;
    if (day <= previousDays) previousTotal += previousDaily.get(day) ?? 0;
    points.push({
      day,
      selected: round4(selectedTotal),
      previous: round4(previousTotal),
    });
  }
  const change = round4(selectedTotal - previousTotal);

  return {
    month,
    currentMonth,
    firstMonth: rangeRows[0]?.first ?? currentMonth,
    previousMonth,
    cashflow,
    spending: {
      month,
      previousMonth,
      selectedTotal: round4(selectedTotal),
      previousTotal: round4(previousTotal),
      change,
      changePct: previousTotal > 0 ? round4(change / previousTotal) : null,
      points,
    },
  };
}
