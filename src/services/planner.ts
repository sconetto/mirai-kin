import { and, eq, gte, inArray, ne, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { accounts, categories, goalAllocations, goals, transactions } from "@/db/schema";
import type { GoalType } from "@/db/schema";
import type { GoalCreateInput, GoalUpdateInput } from "@/lib/schemas";
import {
  classifyGoalStatus,
  DEFAULT_INFLATION_RATE,
  monthsBetween,
  projectedMonthlyIncome,
  projectionRange,
  remainingDebt,
  requiredDebtPayment,
  requiredIncomeIncrease,
  requiredMonthlyContribution,
  RETURN_BAND,
} from "@/lib/goal-trajectory";
import { emergencyRunway } from "@/lib/planner-math";
import { getAccountValues, getNetWorth } from "./equity";
import { getBaseCurrency } from "./settings";
import { resolveRate } from "./fx";

export class GoalValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoalValidationError";
  }
}

type Allocation = { accountId: string; sharePct: number };

function round4(value: number): number {
  return Math.round(value * 10_000) / 10_000;
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

function numberValue(value: unknown, fallback = 0): number {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function validateRates(input: GoalCreateInput | GoalUpdateInput): void {
  if (input.targetAmount !== undefined && numberValue(input.targetAmount) <= 0) {
    throw new GoalValidationError("Target amount must be greater than zero");
  }
  if (input.monthlyContribution !== undefined && numberValue(input.monthlyContribution) < 0) {
    throw new GoalValidationError("Monthly contribution cannot be negative");
  }
  if (input.downPaymentPct !== undefined && input.downPaymentPct !== null) {
    const value = numberValue(input.downPaymentPct);
    if (value < 0 || value > 100) {
      throw new GoalValidationError("Down payment must be between 0% and 100%");
    }
  }
  if (input.interestRate !== undefined && input.interestRate !== null) {
    const value = numberValue(input.interestRate);
    if (value < -0.99 || value > 1) {
      throw new GoalValidationError("Interest rate must be between -99% and 100%");
    }
  }
  if (input.expectedReturn !== undefined) {
    const value = numberValue(input.expectedReturn);
    if (value < -0.99 || value > 1) {
      throw new GoalValidationError("Expected return must be between -99% and 100%");
    }
  }
  if (input.inflationRate !== undefined && input.inflationRate !== null) {
    const value = numberValue(input.inflationRate);
    if (value < -0.5 || value > 1) {
      throw new GoalValidationError("Inflation must be between -50% and 100%");
    }
  }
  if (
    input.manualCurrentAmount !== undefined &&
    input.manualCurrentAmount !== null &&
    numberValue(input.manualCurrentAmount) < 0
  ) {
    throw new GoalValidationError("Manual current amount cannot be negative");
  }
  if (input.targetDate) {
    const date = new Date(`${input.targetDate}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) {
      throw new GoalValidationError("Target date is invalid");
    }
  }
}

function normalizeAllocationInput(input: GoalCreateInput | GoalUpdateInput): Allocation[] {
  const raw =
    input.allocations ?? input.accountIds?.map((accountId) => ({ accountId, sharePct: 100 })) ?? [];
  const seen = new Set<string>();
  return raw.map((allocation) => {
    if (seen.has(allocation.accountId)) {
      throw new GoalValidationError("An account can only appear once in a goal allocation");
    }
    seen.add(allocation.accountId);
    const sharePct = numberValue(allocation.sharePct, 100);
    if (sharePct < 0 || sharePct > 100) {
      throw new GoalValidationError("Allocation share must be between 0% and 100%");
    }
    return { accountId: allocation.accountId, sharePct };
  });
}

async function validateAllocations(
  goalId: string | null,
  allocations: Allocation[],
): Promise<void> {
  if (allocations.length === 0) return;

  const db = getDb();
  const ids = allocations.map((allocation) => allocation.accountId);
  const accountRows = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(inArray(accounts.id, ids));
  if (accountRows.length !== new Set(ids).size) {
    throw new GoalValidationError("One or more funding accounts do not exist");
  }

  const conditions = [inArray(goalAllocations.accountId, ids)];
  if (goalId) conditions.push(ne(goalAllocations.goalId, goalId));
  const existing = await db
    .select({
      goalId: goalAllocations.goalId,
      accountId: goalAllocations.accountId,
      sharePct: goalAllocations.sharePct,
    })
    .from(goalAllocations)
    .where(and(...conditions));

  const totals = new Map<string, number>();
  for (const row of existing) {
    totals.set(row.accountId, (totals.get(row.accountId) ?? 0) + numberValue(row.sharePct));
  }

  // Older goals may still use accountIds without allocation rows.
  const allocatedGoalIds = new Set(existing.map((row) => row.goalId));
  const legacyGoals = await db.select({ id: goals.id, accountIds: goals.accountIds }).from(goals);
  for (const legacy of legacyGoals) {
    if (legacy.id === goalId || allocatedGoalIds.has(legacy.id)) continue;
    const legacyAccountIds = (legacy.accountIds as string[]) ?? [];
    for (const accountId of legacyAccountIds) {
      if (ids.includes(accountId)) {
        totals.set(accountId, (totals.get(accountId) ?? 0) + 100);
      }
    }
  }
  for (const allocation of allocations) {
    const total = (totals.get(allocation.accountId) ?? 0) + allocation.sharePct;
    if (total > 100.0001) {
      throw new GoalValidationError("Funding allocations for an account cannot exceed 100%");
    }
  }
}

function goalValues(input: GoalCreateInput | GoalUpdateInput) {
  const values: Record<string, unknown> = {};
  if (input.name !== undefined) values.name = input.name;
  if (input.type !== undefined) values.type = input.type;
  if (input.targetAmount !== undefined) values.targetAmount = String(input.targetAmount);
  if (input.targetDate !== undefined) values.targetDate = input.targetDate;
  if (input.currency !== undefined) values.currency = input.currency.toUpperCase();
  if (input.priority !== undefined) values.priority = input.priority;
  if (input.fundingMode !== undefined) values.fundingMode = input.fundingMode;
  if (input.manualCurrentAmount !== undefined) {
    values.manualCurrentAmount =
      input.manualCurrentAmount === null ? null : String(input.manualCurrentAmount);
  }
  if (input.monthlyContribution !== undefined) {
    values.monthlyContribution = String(input.monthlyContribution);
  }
  if (input.expectedReturn !== undefined) values.expectedReturn = String(input.expectedReturn);
  if (input.inflationRate !== undefined) {
    values.inflationRate = input.inflationRate === null ? null : String(input.inflationRate);
  }
  if (input.downPaymentPct !== undefined) {
    values.downPaymentPct =
      input.downPaymentPct === null ? null : String(input.downPaymentPct);
  }
  if (input.interestRate !== undefined) {
    values.interestRate = input.interestRate === null ? null : String(input.interestRate);
  }
  if (input.notes !== undefined) values.notes = input.notes;
  return values;
}

export async function listGoals() {
  const db = getDb();
  return db.select().from(goals).orderBy(goals.priority, goals.createdAt);
}

export async function listGoalAllocations(goalIds?: string[]) {
  const db = getDb();
  if (goalIds && goalIds.length === 0) return [];
  const rows = goalIds
    ? await db.select().from(goalAllocations).where(inArray(goalAllocations.goalId, goalIds))
    : await db.select().from(goalAllocations);
  return rows;
}

export async function createGoal(input: GoalCreateInput) {
  validateRates(input);
  const manualOnly = input.type === "debt" || input.type === "income";
  const fundingMode = manualOnly ? "manual" : (input.fundingMode ?? "accounts");
  const allocations = fundingMode === "manual" ? [] : normalizeAllocationInput(input);
  if (fundingMode !== "manual" && allocations.length > 0) {
    await validateAllocations(null, allocations);
  }

  const db = getDb();
  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(goals)
      .values({
        name: input.name,
        type: input.type,
        targetAmount: String(input.targetAmount),
        targetDate: input.targetDate ?? null,
        currency: input.currency.toUpperCase(),
        priority: input.priority ?? 1,
        fundingMode,
        manualCurrentAmount:
          input.manualCurrentAmount === undefined || input.manualCurrentAmount === null
            ? null
            : String(input.manualCurrentAmount),
        monthlyContribution: String(input.monthlyContribution ?? 0),
        expectedReturn: String(input.expectedReturn ?? 0),
        inflationRate:
          input.inflationRate === undefined || input.inflationRate === null
            ? null
            : String(input.inflationRate),
        downPaymentPct:
          input.downPaymentPct === undefined || input.downPaymentPct === null
            ? null
            : String(input.downPaymentPct),
        interestRate:
          input.interestRate === undefined || input.interestRate === null
            ? null
            : String(input.interestRate),
        accountIds: allocations.map((allocation) => allocation.accountId),
        notes: input.notes ?? null,
      })
      .returning();

    if (allocations.length > 0) {
      await tx.insert(goalAllocations).values(
        allocations.map((allocation) => ({
          goalId: row.id,
          accountId: allocation.accountId,
          sharePct: String(allocation.sharePct),
        })),
      );
    }
    return row;
  });
}

export async function updateGoal(id: string, input: GoalUpdateInput) {
  validateRates(input);
  const db = getDb();
  const [existing] = await db.select().from(goals).where(eq(goals.id, id)).limit(1);
  if (!existing) return null;

  const nextType = input.type ?? existing.type;
  const manualOnly = nextType === "debt" || nextType === "income";
  const nextMode = manualOnly ? "manual" : (input.fundingMode ?? existing.fundingMode);
  const shouldReplaceAllocations =
    manualOnly ||
    input.allocations !== undefined ||
    input.accountIds !== undefined ||
    input.fundingMode !== undefined ||
    input.type !== undefined;
  const allocations =
    shouldReplaceAllocations && nextMode !== "manual" ? normalizeAllocationInput(input) : [];
  if (allocations.length > 0) await validateAllocations(id, allocations);

  return db.transaction(async (tx) => {
    const values = goalValues(input);
    if (manualOnly) values.fundingMode = "manual";
    if (shouldReplaceAllocations) {
      values.accountIds = allocations.map((allocation) => allocation.accountId);
    }
    values.updatedAt = new Date();

    const [row] = await tx.update(goals).set(values).where(eq(goals.id, id)).returning();

    if (shouldReplaceAllocations) {
      await tx.delete(goalAllocations).where(eq(goalAllocations.goalId, id));
      if (allocations.length > 0) {
        await tx.insert(goalAllocations).values(
          allocations.map((allocation) => ({
            goalId: id,
            accountId: allocation.accountId,
            sharePct: String(allocation.sharePct),
          })),
        );
      }
    }
    return row ?? null;
  });
}

export async function deleteGoal(id: string) {
  const db = getDb();
  await db.delete(goals).where(eq(goals.id, id));
}

export type PlanGoalStatus = "on_track" | "at_risk" | "off_track" | "insufficient_data";

export type PlanGoal = {
  id: string;
  name: string;
  type: GoalType;
  priority: number;
  status: PlanGoalStatus;
  reason: string | null;
  current: number;
  target: number;
  progress: number;
  projected: { conservative: number; base: number; optimistic: number };
  gap: number;
  requiredMonthly: number | null;
  downPaymentPct: number | null;
  purchasePrice: number | null;
  downPayment: number | null;
  financedAmount: number | null;
  interestRate: number | null;
  currency: string;
  rateDate: string;
  goalCurrency: string;
  targetDate: string | null;
  targetAmountOriginal: number;
  fundingMode: "accounts" | "manual";
  manualCurrentAmountOriginal: number | null;
  monthlyContribution: number;
  monthlyContributionOriginal: number;
  expectedReturn: number;
  inflationRate: number;
  allocations: { accountId: string; sharePct: number }[];
};

export type PlanStatus = {
  asOf: string;
  rateDate: string;
  baseCurrency: string;
  netWorth: { assets: number; liabilities: number; net: number };
  assumptions: { defaultInflation: number; returnBand: number };
  goals: PlanGoal[];
};

export async function getPlanStatus(asOf = new Date()): Promise<PlanStatus> {
  const db = getDb();
  const [baseCurrency, goalRows, allocationRows, accountValues] = await Promise.all([
    getBaseCurrency(),
    db.select().from(goals).orderBy(goals.priority, goals.createdAt),
    listGoalAllocations(),
    getAccountValues(asOf),
  ]);

  const accountById = new Map(accountValues.map((account) => [account.id, account]));
  const allocationsByGoal = new Map<string, Allocation[]>();
  for (const allocation of allocationRows) {
    const rows = allocationsByGoal.get(allocation.goalId) ?? [];
    rows.push({ accountId: allocation.accountId, sharePct: numberValue(allocation.sharePct) });
    allocationsByGoal.set(allocation.goalId, rows);
  }

  const netWorth = await getNetWorth(asOf);

  const planGoals: PlanGoal[] = [];
  for (const goal of goalRows) {
    const goalCurrency = goal.currency.toUpperCase();
    const targetBase =
      numberValue(goal.targetAmount) * (await rateOrOne(goalCurrency, baseCurrency, asOf));
    const monthlyBase =
      numberValue(goal.monthlyContribution) * (await rateOrOne(goalCurrency, baseCurrency, asOf));
    const expectedReturn = numberValue(goal.expectedReturn);
    const inflationRate = numberValue(goal.inflationRate, DEFAULT_INFLATION_RATE);
    const interestRate =
      goal.interestRate === null ? null : numberValue(goal.interestRate);
    const downPaymentPct =
      goal.downPaymentPct === null ? null : numberValue(goal.downPaymentPct);
    const kind = goal.type;
    const storedAllocations = allocationsByGoal.get(goal.id) ?? [];
    const effectiveAllocations =
      kind === "debt" || kind === "income" || goal.fundingMode === "manual"
        ? []
        : storedAllocations.length > 0
          ? storedAllocations
          : (goal.accountIds as string[]).map((accountId) => ({ accountId, sharePct: 100 }));

    let current = 0;
    let fundingMissing = false;
    if (kind === "debt" || kind === "income") {
      current =
        goal.manualCurrentAmount === null
          ? 0
          : numberValue(goal.manualCurrentAmount) *
            (await rateOrOne(goalCurrency, baseCurrency, asOf));
    } else if (goal.fundingMode === "manual") {
      if (goal.manualCurrentAmount === null) {
        fundingMissing = true;
      } else {
        current =
          numberValue(goal.manualCurrentAmount) *
          (await rateOrOne(goalCurrency, baseCurrency, asOf));
      }
    } else if (effectiveAllocations.length === 0) {
      fundingMissing = true;
    } else {
      for (const allocation of effectiveAllocations) {
        const account = accountById.get(allocation.accountId);
        if (!account) {
          fundingMissing = true;
          continue;
        }
        current += account.valueBase * (allocation.sharePct / 100);
      }
    }

    const parsedTargetDate = goal.targetDate ? new Date(`${goal.targetDate}T00:00:00.000Z`) : null;
    const targetDate =
      parsedTargetDate && !Number.isNaN(parsedTargetDate.getTime()) ? parsedTargetDate : null;
    const months = targetDate ? monthsBetween(asOf, targetDate) : 0;
    const realReturn = (1 + expectedReturn) / (1 + inflationRate) - 1;
    const purchasePct = Math.min(100, Math.max(0, downPaymentPct ?? 20));
    const effectiveTarget =
      kind === "purchase" ? targetBase * (purchasePct / 100) : targetBase;
    const outstandingDebt = Math.max(0, targetBase - current);

    let projected: { conservative: number; base: number; optimistic: number };
    let requiredMonthly: number | null;
    let progress: number;
    let gap: number;
    let status: PlanGoalStatus;
    let reason: string | null = null;

    if (kind === "debt") {
      const debtRate = interestRate ?? 0;
      projected = {
        conservative: remainingDebt(
          outstandingDebt,
          Math.max(-0.99, debtRate + RETURN_BAND),
          monthlyBase,
          months,
        ),
        base: remainingDebt(outstandingDebt, debtRate, monthlyBase, months),
        optimistic: remainingDebt(
          outstandingDebt,
          debtRate - RETURN_BAND,
          monthlyBase,
          months,
        ),
      };
      requiredMonthly = targetDate
        ? requiredDebtPayment(outstandingDebt, debtRate, months)
        : null;
      progress = targetBase > 0 ? Math.min(100, (current / targetBase) * 100) : 0;
      gap = Math.max(0, projected.base);
    } else if (kind === "income") {
      projected = {
        conservative: projectedMonthlyIncome(
          current,
          monthlyBase,
          expectedReturn - RETURN_BAND,
          months,
        ),
        base: projectedMonthlyIncome(current, monthlyBase, expectedReturn, months),
        optimistic: projectedMonthlyIncome(
          current,
          monthlyBase,
          expectedReturn + RETURN_BAND,
          months,
        ),
      };
      requiredMonthly = targetDate
        ? requiredIncomeIncrease(current, monthlyBase, expectedReturn, months, targetBase)
        : null;
      progress = targetBase > 0 ? Math.min(100, (current / targetBase) * 100) : 0;
      gap = Math.max(0, targetBase - projected.conservative);
    } else {
      projected = projectionRange(
        current,
        monthlyBase,
        expectedReturn,
        inflationRate,
        months,
      );
      requiredMonthly = targetDate
        ? requiredMonthlyContribution(current, effectiveTarget, realReturn, months)
        : null;
      progress = effectiveTarget > 0 ? Math.min(100, (current / effectiveTarget) * 100) : 0;
      gap = Math.max(0, effectiveTarget - projected.conservative);
    }

    if (numberValue(goal.targetAmount) <= 0) {
      status = "insufficient_data";
      reason = "missing_target";
    } else if (!targetDate) {
      status = "insufficient_data";
      reason = "missing_target_date";
    } else if (fundingMissing) {
      status = "insufficient_data";
      reason = "missing_funding";
    } else if (kind === "debt") {
      if (projected.conservative <= 0) {
        status = "on_track";
      } else if (projected.base <= 0) {
        status = "at_risk";
        reason = "only_base_case_reaches_target";
      } else {
        status = "off_track";
        reason = "base_case_misses_target";
      }
    } else {
      const classified = classifyGoalStatus(effectiveTarget, projected);
      status = classified.status;
      reason = classified.reason;
    }

    planGoals.push({
      id: goal.id,
      name: goal.name,
      type: goal.type,
      priority: goal.priority,
      status,
      reason,
      current: round4(current),
      target: round4(effectiveTarget),
      progress: round4(progress),
      projected: {
        conservative: round4(projected.conservative),
        base: round4(projected.base),
        optimistic: round4(projected.optimistic),
      },
      gap: round4(gap),
      requiredMonthly: requiredMonthly === null ? null : round4(requiredMonthly),
      downPaymentPct: kind === "purchase" ? purchasePct : null,
      purchasePrice: kind === "purchase" ? round4(targetBase) : null,
      downPayment: kind === "purchase" ? round4(effectiveTarget) : null,
      financedAmount:
        kind === "purchase" ? round4(Math.max(0, targetBase - effectiveTarget)) : null,
      interestRate: kind === "debt" ? interestRate : null,
      currency: baseCurrency,
      rateDate: asOf.toISOString().slice(0, 10),
      goalCurrency,
      targetDate: targetDate ? targetDate.toISOString().slice(0, 10) : null,
      targetAmountOriginal: numberValue(goal.targetAmount),
      fundingMode: goal.fundingMode,
      manualCurrentAmountOriginal:
        goal.manualCurrentAmount === null ? null : numberValue(goal.manualCurrentAmount),
      monthlyContribution: round4(monthlyBase),
      monthlyContributionOriginal: numberValue(goal.monthlyContribution),
      expectedReturn,
      inflationRate,
      allocations: effectiveAllocations,
    });
  }

  return {
    asOf: asOf.toISOString().slice(0, 10),
    rateDate: asOf.toISOString().slice(0, 10),
    baseCurrency,
    netWorth: {
      assets: netWorth.assets,
      liabilities: netWorth.liabilities,
      net: netWorth.net,
    },
    assumptions: { defaultInflation: DEFAULT_INFLATION_RATE, returnBand: RETURN_BAND },
    goals: planGoals,
  };
}

export async function getPlanner() {
  const db = getDb();
  const now = new Date();
  const threeMonthsAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 3, 1));

  const [essential] = await db
    .select({ total: sql<string>`coalesce(sum(-${transactions.baseAmount}), 0)` })
    .from(transactions)
    .innerJoin(categories, eq(transactions.categoryId, categories.id))
    .where(
      and(
        gte(transactions.recordDate, threeMonthsAgo),
        sql`${transactions.amount} < 0`,
        sql`${categories.isEssential} = true`,
        sql`${transactions.reviewStatus} <> 'split'`,
      ),
    );

  const essentialMonthly = Number(essential?.total ?? 0) / 3;
  const [plan, accountValues] = await Promise.all([getPlanStatus(now), getAccountValues(now)]);
  const liquid = accountValues
    .filter((account) => ["checking", "savings", "cash"].includes(account.type))
    .reduce((sum, account) => sum + account.valueBase, 0);
  const runwayMonths = emergencyRunway(liquid, essentialMonthly);

  return {
    ...plan,
    liquid: round4(liquid),
    essentialMonthly: round4(essentialMonthly),
    runwayMonths: Number(runwayMonths.toFixed(1)),
    accounts: accountValues.map((account) => ({
      id: account.id,
      name: account.name,
      type: account.type,
      currency: account.currency,
      balance: account.valueBase,
    })),
  };
}
