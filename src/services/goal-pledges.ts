import { and, asc, eq, inArray, lt } from "drizzle-orm";
import { getDb } from "@/db";
import { goalPledges } from "@/db/schema";
import type { GoalPledgeStatus } from "@/db/schema";
import type { GoalPledgeCreateInput, GoalPledgeUpdateInput } from "@/lib/schemas";

export class GoalPledgeValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoalPledgeValidationError";
  }
}

export type GoalPledgeRow = typeof goalPledges.$inferSelect;

function isoDay(asOf: Date): string {
  return asOf.toISOString().slice(0, 10);
}

function validateDueDate(value: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new GoalPledgeValidationError("Pledge due date must be an ISO date");
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new GoalPledgeValidationError("Pledge due date is invalid");
  }
}

function validateAmount(value: string | number): number {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new GoalPledgeValidationError("Pledge amount must be greater than zero");
  }
  return amount;
}

export function effectivePledgeStatus(
  pledge: Pick<GoalPledgeRow, "status" | "dueDate">,
  asOf = new Date(),
): GoalPledgeStatus {
  if (pledge.status === "open" && pledge.dueDate < isoDay(asOf)) return "expired";
  return pledge.status;
}

export async function expireGoalPledges(asOf = new Date()): Promise<number> {
  const db = getDb();
  const rows = await db
    .update(goalPledges)
    .set({ status: "expired", updatedAt: new Date() })
    .where(and(eq(goalPledges.status, "open"), lt(goalPledges.dueDate, isoDay(asOf))))
    .returning({ id: goalPledges.id });
  return rows.length;
}

export async function listGoalPledges(goalId?: string): Promise<GoalPledgeRow[]> {
  const db = getDb();
  if (goalId) {
    return db
      .select()
      .from(goalPledges)
      .where(eq(goalPledges.goalId, goalId))
      .orderBy(asc(goalPledges.dueDate), asc(goalPledges.createdAt));
  }
  return db
    .select()
    .from(goalPledges)
    .orderBy(asc(goalPledges.dueDate), asc(goalPledges.createdAt));
}

export async function listGoalPledgesForGoals(goalIds: string[]): Promise<GoalPledgeRow[]> {
  if (goalIds.length === 0) return [];
  const db = getDb();
  return db
    .select()
    .from(goalPledges)
    .where(inArray(goalPledges.goalId, goalIds))
    .orderBy(asc(goalPledges.dueDate), asc(goalPledges.createdAt));
}

export async function createGoalPledge(input: GoalPledgeCreateInput): Promise<GoalPledgeRow> {
  validateAmount(input.amount);
  validateDueDate(input.dueDate);
  const today = isoDay(new Date());
  const db = getDb();
  const [row] = await db
    .insert(goalPledges)
    .values({
      goalId: input.goalId,
      amount: String(input.amount),
      currency: input.currency.toUpperCase(),
      dueDate: input.dueDate,
      status: input.dueDate < today ? "expired" : "open",
      notes: input.notes ?? null,
    })
    .returning();
  return row;
}

export async function updateGoalPledge(
  id: string,
  input: GoalPledgeUpdateInput,
): Promise<GoalPledgeRow | null> {
  const db = getDb();
  const [existing] = await db.select().from(goalPledges).where(eq(goalPledges.id, id)).limit(1);
  if (!existing) return null;

  const values: Partial<typeof goalPledges.$inferInsert> = { updatedAt: new Date() };
  if (input.amount !== undefined) {
    validateAmount(input.amount);
    values.amount = String(input.amount);
  }
  if (input.currency !== undefined) values.currency = input.currency.toUpperCase();
  if (input.dueDate !== undefined) {
    validateDueDate(input.dueDate);
    values.dueDate = input.dueDate;
  }
  if (input.notes !== undefined) values.notes = input.notes;
  if (input.status !== undefined) {
    values.status = input.status;
  } else if (input.dueDate !== undefined) {
    values.status =
      input.dueDate < isoDay(new Date())
        ? "expired"
        : existing.status === "expired"
          ? "open"
          : existing.status;
  }

  const [row] = await db
    .update(goalPledges)
    .set(values)
    .where(eq(goalPledges.id, id))
    .returning();
  return row ?? null;
}

export async function deleteGoalPledge(id: string): Promise<GoalPledgeRow | null> {
  const db = getDb();
  const [row] = await db.delete(goalPledges).where(eq(goalPledges.id, id)).returning();
  return row ?? null;
}
