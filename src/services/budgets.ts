import { and, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { budgets, transactions } from "@/db/schema";
import type { Budget } from "@/db/schema";
import { getEnv } from "@/lib/env";
import type { BudgetCreateInput } from "@/lib/schemas";

export async function createBudget(input: BudgetCreateInput) {
  const db = getDb();
  const [row] = await db
    .insert(budgets)
    .values({
      name: input.name,
      periodType: input.periodType ?? "monthly",
      startDate: input.startDate.slice(0, 10),
      endDate: input.endDate ? input.endDate.slice(0, 10) : null,
      amount: String(input.amount),
      currency: (input.currency ?? getEnv().BASE_CURRENCY).toUpperCase(),
      accountIds: input.accountIds ?? [],
      categoryIds: input.categoryIds ?? [],
      labelIds: input.labelIds ?? [],
    })
    .returning();
  return row;
}

export async function listBudgets() {
  const db = getDb();
  return db.select().from(budgets).orderBy(budgets.startDate);
}

export async function getBudget(id: string) {
  const db = getDb();
  const [row] = await db.select().from(budgets).where(eq(budgets.id, id)).limit(1);
  return row ?? null;
}

export async function updateBudget(id: string, input: Partial<BudgetCreateInput>) {
  const db = getDb();
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (input.name !== undefined) patch.name = input.name;
  if (input.periodType !== undefined) patch.periodType = input.periodType;
  if (input.startDate !== undefined) patch.startDate = input.startDate.slice(0, 10);
  if (input.endDate !== undefined) patch.endDate = input.endDate ? input.endDate.slice(0, 10) : null;
  if (input.amount !== undefined) patch.amount = String(input.amount);
  if (input.currency !== undefined) patch.currency = input.currency.toUpperCase();
  if (input.accountIds !== undefined) patch.accountIds = input.accountIds;
  if (input.categoryIds !== undefined) patch.categoryIds = input.categoryIds;
  if (input.labelIds !== undefined) patch.labelIds = input.labelIds;

  const [row] = await db.update(budgets).set(patch).where(eq(budgets.id, id)).returning();
  return row ?? null;
}

export async function deleteBudget(id: string) {
  const db = getDb();
  const [row] = await db.delete(budgets).where(eq(budgets.id, id)).returning();
  return row ?? null;
}

function budgetPeriodEnd(budget: Budget): Date | null {
  if (budget.endDate) {
    return new Date(`${budget.endDate}T23:59:59.999Z`);
  }
  const start = new Date(`${budget.startDate}T00:00:00.000Z`);
  if (budget.periodType === "monthly") {
    return new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0, 23, 59, 59, 999));
  }
  if (budget.periodType === "annual") {
    return new Date(Date.UTC(start.getUTCFullYear() + 1, start.getUTCMonth(), 0, 23, 59, 59, 999));
  }
  return null;
}

export async function computeSpend(budget: Budget) {
  const db = getDb();
  const start = new Date(`${budget.startDate}T00:00:00.000Z`);
  const end = budgetPeriodEnd(budget);

  const conditions = [gte(transactions.recordDate, start)];
  if (end) conditions.push(lte(transactions.recordDate, end));
  if (budget.accountIds.length > 0) {
    conditions.push(inArray(transactions.accountId, budget.accountIds));
  }
  if (budget.categoryIds.length > 0) {
    conditions.push(inArray(transactions.categoryId, budget.categoryIds));
  }
  if (budget.labelIds.length > 0) {
    conditions.push(sql`${transactions.labelIds} && ${JSON.stringify(budget.labelIds)}::jsonb`);
  }

  const [aggregate] = await db
    .select({
      expenses: sql<string>`coalesce(sum(case when ${transactions.amount} < 0 then -${transactions.baseAmount} else 0 end), 0)`,
      income: sql<string>`coalesce(sum(case when ${transactions.amount} > 0 then ${transactions.baseAmount} else 0 end), 0)`,
    })
    .from(transactions)
    .where(and(...conditions));

  const expenses = Number(aggregate?.expenses ?? 0);
  const income = Number(aggregate?.income ?? 0);
  const spend = Math.max(0, expenses - income);
  const amount = Number(budget.amount);

  return {
    expenses: expenses.toFixed(4),
    income: income.toFixed(4),
    spend: spend.toFixed(4),
    amount: amount.toFixed(4),
    remaining: (amount - spend).toFixed(4),
    overBudget: spend > amount,
  };
}

export async function listBudgetsWithSpend() {
  const rows = await listBudgets();
  const result = [];
  for (const budget of rows) {
    result.push({ ...budget, ...(await computeSpend(budget)) });
  }
  return result;
}
