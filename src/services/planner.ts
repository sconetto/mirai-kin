import { and, eq, gte, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { categories, goals, transactions } from "@/db/schema";
import type { GoalType } from "@/db/schema";
import { emergencyRunway } from "@/lib/planner-math";
import { listAccountBalances } from "./accounts";

export async function listGoals() {
  const db = getDb();
  return db.select().from(goals).orderBy(goals.priority, goals.createdAt);
}

export async function createGoal(input: {
  name: string;
  type: GoalType;
  targetAmount: string | number;
  targetDate?: string | null;
  currency: string;
  priority?: number;
  notes?: string | null;
}) {
  const db = getDb();
  const [row] = await db
    .insert(goals)
    .values({
      name: input.name,
      type: input.type,
      targetAmount: String(input.targetAmount),
      targetDate: input.targetDate ?? null,
      currency: input.currency,
      priority: input.priority ?? 1,
      notes: input.notes ?? null,
    })
    .returning();
  return row;
}

export async function updateGoal(
  id: string,
  input: {
    targetAmount?: string | number;
    targetDate?: string | null;
    priority?: number;
    notes?: string | null;
  },
) {
  const db = getDb();
  const [row] = await db
    .update(goals)
    .set({
      ...(input.targetAmount !== undefined ? { targetAmount: String(input.targetAmount) } : {}),
      ...(input.targetDate !== undefined ? { targetDate: input.targetDate } : {}),
      ...(input.priority !== undefined ? { priority: input.priority } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
    })
    .where(eq(goals.id, id))
    .returning();
  return row ?? null;
}

export async function deleteGoal(id: string) {
  const db = getDb();
  await db.delete(goals).where(eq(goals.id, id));
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
  const balances = await listAccountBalances();
  const liquid = balances
    .filter((account) => ["checking", "savings", "cash"].includes(account.type))
    .reduce((sum, account) => sum + Number(account.balance), 0);
  const runwayMonths = emergencyRunway(liquid, essentialMonthly);

  const goalsWithProgress = (await listGoals()).map((goal) => {
    const accountIds = Array.isArray(goal.accountIds) ? (goal.accountIds as string[]) : [];
    const current = balances
      .filter((account) => accountIds.includes(account.id))
      .reduce((sum, account) => sum + Number(account.balance), 0);
    const target = Number(goal.targetAmount);
    return {
      ...goal,
      current: Number(current.toFixed(4)),
      progress:
        target > 0 ? Math.min(100, Number(((current / target) * 100).toFixed(1))) : 0,
    };
  });

  return {
    goals: goalsWithProgress,
    liquid: Number(liquid.toFixed(4)),
    essentialMonthly: Number(essentialMonthly.toFixed(4)),
    runwayMonths: Number(runwayMonths.toFixed(1)),
  };
}
