import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { debts, debtSchedule } from "@/db/schema";
import { buildSchedule } from "@/lib/amortization";
import type { DebtCreateInput } from "@/lib/schemas";

function toRow(debt: typeof debts.$inferSelect) {
  return {
    principal: Number(debt.principal),
    // Stored as an annual percentage (e.g. 12 = 12%); the scheduler expects a decimal.
    annualRate: Number(debt.interestRate) / 100,
    term: debt.term,
    startDate: debt.startDate,
    method: debt.amortizationMethod,
    gracePeriods: debt.gracePeriods,
  };
}

async function replaceSchedule(debtId: string) {
  const db = getDb();
  const [debt] = await db.select().from(debts).where(eq(debts.id, debtId)).limit(1);
  if (!debt) return [];

  await db.delete(debtSchedule).where(eq(debtSchedule.debtId, debtId));

  const rows = buildSchedule(toRow(debt));
  if (rows.length === 0) return [];

  await db.insert(debtSchedule).values(
    rows.map((row) => ({
      debtId,
      periodNumber: row.periodNumber,
      dueDate: row.dueDate,
      payment: row.payment.toFixed(4),
      interest: row.interest.toFixed(4),
      principal: row.principal.toFixed(4),
      balance: row.balance.toFixed(4),
    })),
  );

  return rows;
}

export async function createDebt(input: DebtCreateInput) {
  const db = getDb();
  const [debt] = await db
    .insert(debts)
    .values({
      accountId: input.accountId ?? null,
      name: input.name,
      type: input.type,
      principal: String(input.principal),
      interestRate: String(input.interestRate),
      term: input.term,
      startDate: input.startDate,
      paymentFrequency: input.paymentFrequency ?? "monthly",
      amortizationMethod: input.amortizationMethod,
      gracePeriods: input.gracePeriods ?? 0,
      currency: input.currency.toUpperCase(),
    })
    .returning();

  await replaceSchedule(debt.id);
  return getDebtWithSchedule(debt.id);
}

export async function listDebts() {
  const db = getDb();
  return db.select().from(debts).orderBy(debts.startDate);
}

export async function getDebtWithSchedule(id: string) {
  const db = getDb();
  const [debt] = await db.select().from(debts).where(eq(debts.id, id)).limit(1);
  if (!debt) return null;
  const schedule = await db
    .select()
    .from(debtSchedule)
    .where(eq(debtSchedule.debtId, id))
    .orderBy(asc(debtSchedule.periodNumber));
  return { ...debt, schedule };
}

export async function updateDebt(id: string, input: Partial<DebtCreateInput>) {
  const db = getDb();
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (input.accountId !== undefined) patch.accountId = input.accountId;
  if (input.name !== undefined) patch.name = input.name;
  if (input.type !== undefined) patch.type = input.type;
  if (input.principal !== undefined) patch.principal = String(input.principal);
  if (input.interestRate !== undefined) patch.interestRate = String(input.interestRate);
  if (input.term !== undefined) patch.term = input.term;
  if (input.startDate !== undefined) patch.startDate = input.startDate;
  if (input.paymentFrequency !== undefined) patch.paymentFrequency = input.paymentFrequency;
  if (input.amortizationMethod !== undefined) patch.amortizationMethod = input.amortizationMethod;
  if (input.gracePeriods !== undefined) patch.gracePeriods = input.gracePeriods;
  if (input.currency !== undefined) patch.currency = input.currency.toUpperCase();

  const [row] = await db.update(debts).set(patch).where(eq(debts.id, id)).returning();
  if (!row) return null;

  await replaceSchedule(id);
  return getDebtWithSchedule(id);
}

export async function deleteDebt(id: string) {
  const db = getDb();
  const [row] = await db.delete(debts).where(eq(debts.id, id)).returning();
  return row ?? null;
}
