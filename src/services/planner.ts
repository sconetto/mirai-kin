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

  return {
    goals: await listGoals(),
    liquid: Number(liquid.toFixed(4)),
    essentialMonthly: Number(essentialMonthly.toFixed(4)),
    runwayMonths: Number(runwayMonths.toFixed(1)),
  };
}
