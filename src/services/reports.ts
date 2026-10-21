import { and, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  categories,
  dividends,
  investmentPositions,
  savedReports,
  transactions,
} from "@/db/schema";
import { getBaseCurrency } from "./settings";
import { resolveRate } from "./fx";

export type ReportType = "cashflow" | "income" | "expenses" | "transfers" | "breakdown";

export type ReportConfig = {
  type: ReportType;
  from: string;
  to: string;
  groupBy?: "month" | "category";
  accountIds?: string[];
  categoryIds?: string[];
  labelIds?: string[];
  comparison?: boolean;
};

export type ReportRow = {
  key: string;
  label: string;
  income: number;
  expenses: number;
  transfers: number;
  net: number;
};

export type ReportSummary = {
  income: number;
  expenses: number;
  transfers: number;
  net: number;
  average: number;
};

export type Report = {
  type: ReportType;
  from: string;
  to: string;
  currency: string;
  summary: ReportSummary;
  rows: ReportRow[];
  comparison?: {
    previous: ReportSummary;
    priorYear: ReportSummary;
  };
};

function bounds(from: string, to: string) {
  return {
    start: new Date(`${from.slice(0, 10)}T00:00:00.000Z`),
    end: new Date(`${to.slice(0, 10)}T23:59:59.999Z`),
  };
}

function summarize(rows: ReportRow[], months: number): ReportSummary {
  const summary = rows.reduce(
    (acc, row) => {
      acc.income += row.income;
      acc.expenses += row.expenses;
      acc.transfers += row.transfers;
      acc.net += row.net;
      return acc;
    },
    { income: 0, expenses: 0, transfers: 0, net: 0, average: 0 },
  );
  const divisor = Math.max(months, 1);
  return {
    income: Number(summary.income.toFixed(4)),
    expenses: Number(summary.expenses.toFixed(4)),
    transfers: Number(summary.transfers.toFixed(4)),
    net: Number(summary.net.toFixed(4)),
    average: Number((summary.net / divisor).toFixed(4)),
  };
}

function monthsBetween(from: string, to: string): number {
  const start = new Date(`${from.slice(0, 10)}T00:00:00.000Z`);
  const end = new Date(`${to.slice(0, 10)}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 1;
  return Math.max(
    1,
    (end.getUTCFullYear() - start.getUTCFullYear()) * 12 +
      (end.getUTCMonth() - start.getUTCMonth()) +
      1,
  );
}

function baseConditions(config: ReportConfig) {
  const { start, end } = bounds(config.from, config.to);
  const conditions = [
    gte(transactions.recordDate, start),
    lte(transactions.recordDate, end),
    sql`${transactions.reviewStatus} <> 'split'`,
  ];
  if (config.accountIds?.length) {
    conditions.push(inArray(transactions.accountId, config.accountIds));
  }
  if (config.categoryIds?.length) {
    conditions.push(inArray(transactions.categoryId, config.categoryIds));
  }
  return conditions;
}

async function getPeriodRows(config: ReportConfig): Promise<ReportRow[]> {
  const db = getDb();
  const periodExpr = sql<string>`to_char(${transactions.recordDate} at time zone 'UTC', 'YYYY-MM')`;

  const rows = await db
    .select({
      key: periodExpr,
      income: sql<string>`coalesce(sum(case when ${transactions.amount} > 0 and ${transactions.transferId} is null and (${transactions.paymentType} is null or ${transactions.paymentType} <> 'transfer') then ${transactions.baseAmount} else 0 end), 0)`,
      expenses: sql<string>`coalesce(sum(case when ${transactions.amount} < 0 and ${transactions.transferId} is null and (${transactions.paymentType} is null or ${transactions.paymentType} <> 'transfer') then -${transactions.baseAmount} else 0 end), 0)`,
      transfers: sql<string>`coalesce(sum(case when ${transactions.amount} < 0 and (${transactions.transferId} is not null or ${transactions.paymentType} = 'transfer') then abs(${transactions.baseAmount}) else 0 end), 0)`,
    })
    .from(transactions)
    .where(and(...baseConditions(config)))
    .groupBy(periodExpr)
    .orderBy(periodExpr);

  return rows.map((row) => {
    const income = Number(row.income);
    const expenses = Number(row.expenses);
    const transfers = Number(row.transfers);
    return {
      key: row.key,
      label: row.key,
      income,
      expenses,
      transfers,
      net: Number((income - expenses).toFixed(4)),
    };
  });
}

async function getCategoryRows(config: ReportConfig): Promise<ReportRow[]> {
  const db = getDb();
  const conditions = [
    ...baseConditions(config),
    sql`${transactions.transferId} is null`,
    sql`(${transactions.paymentType} is null or ${transactions.paymentType} <> 'transfer')`,
  ];
  const rows = await db
    .select({
      key: sql<string>`coalesce(${categories.name}, 'Uncategorized')`,
      expenses: sql<string>`coalesce(sum(case when ${transactions.amount} < 0 then -${transactions.baseAmount} else 0 end), 0)`,
      income: sql<string>`coalesce(sum(case when ${transactions.amount} > 0 then ${transactions.baseAmount} else 0 end), 0)`,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(and(...conditions))
    .groupBy(categories.name)
    .orderBy(sql`sum(case when ${transactions.amount} < 0 then -${transactions.baseAmount} else 0 end) desc`);

  return rows.map((row) => {
    const income = Number(row.income);
    const expenses = Number(row.expenses);
    return {
      key: row.key,
      label: row.key,
      income,
      expenses,
      transfers: 0,
      net: Number((income - expenses).toFixed(4)),
    };
  });
}

async function mergeDividendIncome(
  rows: ReportRow[],
  config: ReportConfig,
): Promise<ReportRow[]> {
  if (config.type !== "income" || config.categoryIds?.length) return rows;

  const conditions = [
    gte(dividends.date, config.from.slice(0, 10)),
    lte(dividends.date, config.to.slice(0, 10)),
  ];
  if (config.accountIds?.length) {
    conditions.push(inArray(investmentPositions.accountId, config.accountIds));
  }

  const dividendRows = await getDb()
    .select({
      date: dividends.date,
      amount: dividends.amount,
      currency: dividends.currency,
    })
    .from(dividends)
    .innerJoin(investmentPositions, eq(dividends.positionId, investmentPositions.id))
    .where(and(...conditions));

  if (dividendRows.length === 0) return rows;

  const baseCurrency = await getBaseCurrency();
  const byMonth = new Map<string, number>();
  for (const dividend of dividendRows) {
    let amount = Number(dividend.amount);
    const currency = dividend.currency.toUpperCase();
    if (currency !== baseCurrency) {
      try {
        const { rate } = await resolveRate(
          currency,
          baseCurrency,
          new Date(`${dividend.date}T00:00:00.000Z`),
        );
        amount *= Number(rate);
      } catch {
        // Without an FX rate we keep the original amount rather than dropping income.
      }
    }
    const month = dividend.date.slice(0, 7);
    byMonth.set(month, (byMonth.get(month) ?? 0) + amount);
  }

  const merged = new Map(rows.map((row) => [row.key, { ...row }]));
  for (const [month, amount] of byMonth) {
    const row =
      merged.get(month) ??
      { key: month, label: month, income: 0, expenses: 0, transfers: 0, net: 0 };
    const income = Number((row.income + amount).toFixed(4));
    merged.set(month, {
      ...row,
      income,
      net: Number((income - row.expenses).toFixed(4)),
    });
  }

  return [...merged.values()].sort((a, b) => a.key.localeCompare(b.key));
}

async function buildReport(config: ReportConfig): Promise<Report> {
  const baseRows =
    config.type === "breakdown" ? await getCategoryRows(config) : await getPeriodRows(config);
  const periodRows = await mergeDividendIncome(baseRows, config);
  const months = config.type === "breakdown" ? 1 : monthsBetween(config.from, config.to);
  return {
    type: config.type,
    from: config.from,
    to: config.to,
    currency: await getBaseCurrency(),
    summary: summarize(periodRows, months),
    rows: periodRows,
  };
}

function shiftRange(from: string, to: string, months: number) {
  const start = new Date(`${from.slice(0, 10)}T00:00:00.000Z`);
  const end = new Date(`${to.slice(0, 10)}T00:00:00.000Z`);
  const shift = (date: Date, delta: number) => {
    const next = new Date(date);
    next.setUTCMonth(next.getUTCMonth() + delta);
    return next.toISOString().slice(0, 10);
  };
  return { from: shift(start, months), to: shift(end, months) };
}

export async function getReport(config: ReportConfig): Promise<Report> {
  const report = await buildReport(config);
  if (!config.comparison) return report;

  const previousRange = shiftRange(config.from, config.to, -monthsBetween(config.from, config.to));
  const priorYearRange = shiftRange(config.from, config.to, -12);
  const [previous, priorYear] = await Promise.all([
    buildReport({ ...config, ...previousRange, comparison: false }),
    buildReport({ ...config, ...priorYearRange, comparison: false }),
  ]);

  return { ...report, comparison: { previous: previous.summary, priorYear: priorYear.summary } };
}

export async function getCashflowReport(from: string, to: string) {
  return getReport({ type: "cashflow", from, to });
}

export async function getBreakdownReport(from: string, to: string) {
  return getReport({ type: "breakdown", from, to });
}

export async function listSavedReports() {
  const db = getDb();
  return db.select().from(savedReports).orderBy(savedReports.createdAt);
}

export async function saveReport(name: string, config: ReportConfig) {
  const db = getDb();
  const [row] = await db.insert(savedReports).values({ name, config }).returning();
  return row;
}

export async function deleteSavedReport(id: string) {
  const db = getDb();
  const [row] = await db.delete(savedReports).where(eq(savedReports.id, id)).returning();
  return row ?? null;
}

export function reportToCsv(report: Report): string {
  const header = ["period", "income", "expenses", "transfers", "net"];
  const lines = report.rows.map((row) =>
    [row.key, row.income.toFixed(2), row.expenses.toFixed(2), row.transfers.toFixed(2), row.net.toFixed(2)]
      .map((value) => `"${String(value).replace(/"/g, '""')}"`)
      .join(","),
  );
  lines.unshift(
    [`"summary"`, report.summary.income.toFixed(2), report.summary.expenses.toFixed(2), report.summary.transfers.toFixed(2), report.summary.net.toFixed(2)].join(","),
  );
  return [header.join(","), ...lines].join("\n");
}
