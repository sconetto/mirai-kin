import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { entities } from "@/db/schema";
import type { EntityCreateInput, EntityUpdateInput } from "@/lib/schemas";

function nullableString(value: unknown): string | null {
  return value === undefined || value === null || value === "" ? null : String(value);
}

function entityValues(input: EntityCreateInput | EntityUpdateInput) {
  const values: Record<string, unknown> = {};
  if (input.kind !== undefined) values.kind = input.kind;
  if (input.name !== undefined) values.name = input.name;
  if (input.currency !== undefined) values.currency = input.currency.toUpperCase();
  if (input.accountId !== undefined) values.accountId = input.accountId ?? null;
  if (input.value !== undefined) values.value = nullableString(input.value);
  if (input.balance !== undefined) values.balance = nullableString(input.balance);
  if (input.amount !== undefined) values.amount = nullableString(input.amount);
  if (input.interestRate !== undefined) {
    values.interestRate = nullableString(input.interestRate);
  }
  if (input.termMonths !== undefined) values.termMonths = input.termMonths ?? null;
  if (input.monthlyPayment !== undefined) {
    values.monthlyPayment = nullableString(input.monthlyPayment);
  }
  if (input.startDate !== undefined) values.startDate = input.startDate ?? null;
  if (input.dueDay !== undefined) values.dueDay = input.dueDay ?? null;
  if (input.frequency !== undefined) values.frequency = input.frequency ?? null;
  if (input.nextDueDate !== undefined) values.nextDueDate = input.nextDueDate ?? null;
  if (input.appreciationRate !== undefined) {
    values.appreciationRate = nullableString(input.appreciationRate);
  }
  if (input.notes !== undefined) values.notes = input.notes ?? null;
  return values;
}

export async function listEntities(kind?: string) {
  const db = getDb();
  const query = db.select().from(entities);
  const rows = kind
    ? await query.where(eq(entities.kind, kind as never)).orderBy(asc(entities.name))
    : await query.orderBy(asc(entities.kind), asc(entities.name));
  return rows;
}

export async function getEntity(id: string) {
  const db = getDb();
  const [row] = await db.select().from(entities).where(eq(entities.id, id)).limit(1);
  return row ?? null;
}

export async function createEntity(input: EntityCreateInput) {
  const db = getDb();
  const [row] = await db
    .insert(entities)
    .values({
      kind: input.kind,
      name: input.name,
      currency: input.currency.toUpperCase(),
      ...entityValues(input),
    })
    .returning();
  return row;
}

export async function updateEntity(id: string, input: EntityUpdateInput) {
  const db = getDb();
  const [row] = await db
    .update(entities)
    .set({ ...entityValues(input), updatedAt: new Date() })
    .where(eq(entities.id, id))
    .returning();
  return row ?? null;
}

export async function deleteEntity(id: string) {
  const db = getDb();
  const [row] = await db.delete(entities).where(eq(entities.id, id)).returning();
  return row ?? null;
}
