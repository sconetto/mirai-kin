import { getDb } from "@/db";
import { debts, debtSchedule, recurringTransactions } from "@/db/schema";
import type { RecurrenceFrequency } from "@/db/schema";
import { addMonths } from "@/lib/amortization";
import { getEnv } from "@/lib/env";
import type { RecurringTransactionCreateInput } from "@/lib/schemas";
import { resolveRate } from "./fx";

function round4(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

export async function createRecurring(input: RecurringTransactionCreateInput) {
  const db = getDb();
  const [row] = await db
    .insert(recurringTransactions)
    .values({
      accountId: input.accountId,
      categoryId: input.categoryId ?? null,
      amount: String(input.amount),
      currency: (input.currency ?? getEnv().BASE_CURRENCY).toUpperCase(),
      frequency: input.frequency,
      startDate: input.startDate.slice(0, 10),
      endDate: input.endDate ? input.endDate.slice(0, 10) : null,
      note: input.note ?? null,
      paymentType: input.paymentType ?? null,
    })
    .returning();
  return row;
}

export async function listRecurring() {
  const db = getDb();
  return db.select().from(recurringTransactions).orderBy(recurringTransactions.startDate);
}

async function rateOrOne(from: string, to: string, date: Date): Promise<number> {
  try {
    const { rate } = await resolveRate(from, to, date);
    return Number(rate);
  } catch {
    return 1;
  }
}

function expandOccurrences(
  startDate: string,
  endDate: string | null,
  frequency: RecurrenceFrequency,
  rangeStart: Date,
  rangeEnd: Date,
): Date[] {
  const dates: Date[] = [];
  let current = new Date(`${startDate.slice(0, 10)}T00:00:00.000Z`);
  const hardEnd = endDate ? new Date(`${endDate.slice(0, 10)}T23:59:59.999Z`) : rangeEnd;
  const stop = hardEnd < rangeEnd ? hardEnd : rangeEnd;

  let guard = 0;
  while (current <= stop && guard < 20_000) {
    if (current >= rangeStart) dates.push(new Date(current));
    if (frequency === "daily") {
      current = new Date(current.getTime() + 86_400_000);
    } else if (frequency === "weekly") {
      current = new Date(current.getTime() + 7 * 86_400_000);
    } else if (frequency === "monthly") {
      current = new Date(`${addMonths(current.toISOString().slice(0, 10), 1)}T00:00:00.000Z`);
    } else if (frequency === "yearly") {
      current = new Date(`${addMonths(current.toISOString().slice(0, 10), 12)}T00:00:00.000Z`);
    } else {
      break;
    }
    guard += 1;
  }

  return dates;
}

type MonthBucket = {
  month: string;
  income: number;
  expenses: number;
  debtPayments: number;
  net: number;
};

export async function forecast(horizonMonths = 12) {
  const db = getDb();
  const baseCurrency = getEnv().BASE_CURRENCY.toUpperCase();
  const now = new Date();
  const horizonStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const horizonEnd = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + horizonMonths, 0, 23, 59, 59, 999),
  );

  const recurring = await db.select().from(recurringTransactions);
  const scheduleRows = await db.select().from(debtSchedule);
  const debtRows = await db.select().from(debts);
  const debtCurrency = new Map(debtRows.map((row) => [row.id, row.currency]));

  const months: MonthBucket[] = [];
  for (let index = 0; index < horizonMonths; index += 1) {
    const monthStart = new Date(
      Date.UTC(horizonStart.getUTCFullYear(), horizonStart.getUTCMonth() + index, 1),
    );
    months.push({
      month: monthStart.toISOString().slice(0, 7),
      income: 0,
      expenses: 0,
      debtPayments: 0,
      net: 0,
    });
  }

  for (const item of recurring) {
    const occurrences = expandOccurrences(
      item.startDate,
      item.endDate,
      item.frequency,
      horizonStart,
      horizonEnd,
    );
    for (const date of occurrences) {
      const bucket = months.find((month) => month.month === date.toISOString().slice(0, 7));
      if (!bucket) continue;
      const rate = await rateOrOne(item.currency, baseCurrency, date);
      const amount = Number(item.amount) * rate;
      if (amount >= 0) bucket.income += amount;
      else bucket.expenses += -amount;
    }
  }

  for (const row of scheduleRows) {
    const due = new Date(`${row.dueDate}T00:00:00.000Z`);
    if (due < horizonStart || due > horizonEnd) continue;
    const bucket = months.find((month) => month.month === due.toISOString().slice(0, 7));
    if (!bucket) continue;
    const currency = debtCurrency.get(row.debtId) ?? baseCurrency;
    const rate = await rateOrOne(currency, baseCurrency, due);
    bucket.debtPayments += Number(row.payment) * rate;
  }

  for (const bucket of months) {
    bucket.income = round4(bucket.income);
    bucket.expenses = round4(bucket.expenses);
    bucket.debtPayments = round4(bucket.debtPayments);
    bucket.net = round4(bucket.income - bucket.expenses - bucket.debtPayments);
  }

  return { baseCurrency, horizonMonths, months };
}
