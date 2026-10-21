import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { debts, debtSchedule, recurringTransactions } from "@/db/schema";
import type { RecurrenceFrequency } from "@/db/schema";
import { addMonths } from "@/lib/amortization";
import {
  DEFAULT_INFLATION_RATE,
  futureValue,
  realAnnualReturn,
  RETURN_BAND,
} from "@/lib/goal-trajectory";
import { getBaseCurrency } from "./settings";
import type { RecurringTransactionCreateInput } from "@/lib/schemas";
import { resolveRate } from "./fx";
import { getPlanStatus } from "./planner";

function round4(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

export async function createRecurring(input: RecurringTransactionCreateInput) {
  const db = getDb();

  if (input.externalSource && input.externalId) {
    const [existing] = await db
      .select()
      .from(recurringTransactions)
      .where(
        and(
          eq(recurringTransactions.externalSource, input.externalSource),
          eq(recurringTransactions.externalId, input.externalId),
        ),
      )
      .limit(1);
    if (existing) return existing;
  }

  const [row] = await db
    .insert(recurringTransactions)
    .values({
      accountId: input.accountId,
      categoryId: input.categoryId ?? null,
      amount: String(input.amount),
      currency: (input.currency ?? (await getBaseCurrency())).toUpperCase(),
      frequency: input.frequency,
      startDate: input.startDate.slice(0, 10),
      endDate: input.endDate ? input.endDate.slice(0, 10) : null,
      note: input.note ?? null,
      paymentType: input.paymentType ?? null,
      externalSource: input.externalSource,
      externalId: input.externalId,
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
  const baseCurrency = await getBaseCurrency();
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

export type ScenarioKey = "base" | "optimistic" | "pessimistic";

const SCENARIOS: {
  key: ScenarioKey;
  incomeMultiplier: number;
  expenseMultiplier: number;
}[] = [
  { key: "base", incomeMultiplier: 1, expenseMultiplier: 1 },
  { key: "optimistic", incomeMultiplier: 1.1, expenseMultiplier: 0.95 },
  { key: "pessimistic", incomeMultiplier: 0.9, expenseMultiplier: 1.1 },
];

export async function compareScenarios(horizonMonths = 12) {
  const base = await forecast(horizonMonths);

  const scenarios = SCENARIOS.map((scenario) => {
    let cumulative = 0;
    const months = base.months.map((month) => {
      const net =
        month.income * scenario.incomeMultiplier -
        month.expenses * scenario.expenseMultiplier -
        month.debtPayments;
      cumulative += net;
      return {
        month: month.month,
        net: round4(net),
        cumulative: round4(cumulative),
      };
    });
    return {
      key: scenario.key,
      totalNet: round4(cumulative),
      months,
    };
  });

  return { baseCurrency: base.baseCurrency, horizonMonths, scenarios };
}

export type PlanAssumptionOverrides = Partial<{
  expectedReturn: number;
  inflation: number;
  monthlyContribution: number;
  horizonMonths: number;
}>;

export type PlanTrajectoryPoint = {
  date: string;
  conservative: number;
  base: number;
  optimistic: number;
};

export type PlanTrajectoryAssumptions = {
  expectedReturn: number;
  inflation: number;
  monthlyContribution: number;
  returnBand: number;
  horizonMonths: number;
};

export type PlanTrajectory = {
  asOf: string;
  baseCurrency: string;
  assumptions: PlanTrajectoryAssumptions;
  points: PlanTrajectoryPoint[];
};

export function resolvePlanAssumptions(
  base: PlanTrajectoryAssumptions,
  overrides: PlanAssumptionOverrides,
  horizonMonths: number,
): PlanTrajectoryAssumptions {
  return {
    expectedReturn: overrides.expectedReturn ?? base.expectedReturn,
    inflation: overrides.inflation ?? base.inflation,
    monthlyContribution: overrides.monthlyContribution ?? base.monthlyContribution,
    returnBand: base.returnBand,
    horizonMonths: overrides.horizonMonths ?? horizonMonths,
  };
}

export function projectPlanTrajectory(input: {
  netWorth: number;
  baseCurrency: string;
  asOf: string;
  expectedReturn: number;
  inflation: number;
  monthlyContribution: number;
  horizonMonths: number;
}): PlanTrajectory {
  const realReturn = realAnnualReturn(input.expectedReturn, input.inflation);
  const conservativeReturn = realAnnualReturn(
    Math.max(-0.99, input.expectedReturn - RETURN_BAND),
    input.inflation,
  );
  const optimisticReturn = realAnnualReturn(input.expectedReturn + RETURN_BAND, input.inflation);
  const startDate = input.asOf.slice(0, 10);
  const points: PlanTrajectoryPoint[] = [];

  for (let month = 0; month <= input.horizonMonths; month += 1) {
    points.push({
      date: addMonths(startDate, month),
      conservative: round4(
        futureValue(input.netWorth, input.monthlyContribution, conservativeReturn, month),
      ),
      base: round4(futureValue(input.netWorth, input.monthlyContribution, realReturn, month)),
      optimistic: round4(
        futureValue(input.netWorth, input.monthlyContribution, optimisticReturn, month),
      ),
    });
  }

  return {
    asOf: startDate,
    baseCurrency: input.baseCurrency,
    assumptions: {
      expectedReturn: input.expectedReturn,
      inflation: input.inflation,
      monthlyContribution: round4(input.monthlyContribution),
      returnBand: RETURN_BAND,
      horizonMonths: input.horizonMonths,
    },
    points,
  };
}

/**
 * Deterministic, real-terms net-worth projection for the plan dashboard.
 * The starting point is canonical net worth; contributions are the sum of
 * funded goal contributions. Scheduled debt is already represented in net
 * worth, so the projection does not subtract it again.
 */
export async function planTrajectory(
  horizonMonths = 120,
  asOf = new Date(),
  overrides: PlanAssumptionOverrides = {},
): Promise<PlanTrajectory> {
  const plan = await getPlanStatus(asOf);
  const funded = plan.goals.filter((goal) => goal.target > 0);
  const weight = funded.reduce((sum, goal) => sum + goal.target, 0);
  const baseReturn =
    weight > 0
      ? funded.reduce((sum, goal) => sum + goal.expectedReturn * goal.target, 0) / weight
      : 0.05;
  const baseInflation =
    weight > 0
      ? funded.reduce((sum, goal) => sum + goal.inflationRate * goal.target, 0) / weight
      : DEFAULT_INFLATION_RATE;
  const baseContribution = plan.goals.reduce((sum, goal) => sum + goal.monthlyContribution, 0);
  const effective = resolvePlanAssumptions(
    {
      expectedReturn: baseReturn,
      inflation: baseInflation,
      monthlyContribution: baseContribution,
      returnBand: RETURN_BAND,
      horizonMonths,
    },
    overrides,
    horizonMonths,
  );

  return projectPlanTrajectory({
    netWorth: plan.netWorth.net,
    baseCurrency: plan.baseCurrency,
    asOf: plan.asOf,
    expectedReturn: effective.expectedReturn,
    inflation: effective.inflation,
    monthlyContribution: effective.monthlyContribution,
    horizonMonths: effective.horizonMonths,
  });
}
