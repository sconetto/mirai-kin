import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { accounts, transactions } from "@/db/schema";
import type { PaymentType } from "@/db/schema";
import { getEnv } from "@/lib/env";
import type { TransactionCreateInput } from "@/lib/schemas";
import { toBaseAmount } from "./fx";

export class TransactionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TransactionValidationError";
  }
}

function parseDate(value: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new TransactionValidationError(`Invalid date: ${value}`);
  }
  return date;
}

export async function createTransaction(input: TransactionCreateInput) {
  const db = getDb();

  const [account] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.id, input.accountId))
    .limit(1);
  if (!account) {
    throw new TransactionValidationError(`Account not found: ${input.accountId}`);
  }

  const currency = (input.currency ?? account.currency).toUpperCase();
  const baseCurrency = getEnv().BASE_CURRENCY.toUpperCase();
  const recordDate = parseDate(input.recordDate);
  const { baseAmount, fxRateId } = await toBaseAmount(
    String(input.amount),
    currency,
    baseCurrency,
    recordDate,
  );

  const [row] = await db
    .insert(transactions)
    .values({
      accountId: input.accountId,
      categoryId: input.categoryId ?? null,
      amount: String(input.amount),
      currency,
      baseCurrency,
      baseAmount,
      fxRateId,
      recordDate,
      note: input.note ?? null,
      paymentType: input.paymentType ?? null,
      counterparty: input.counterparty ?? null,
      labelIds: input.labelIds ?? [],
    })
    .returning();

  return row;
}

export type BatchItemResult = {
  inputIndex: number;
  success: boolean;
  id?: string;
  error?: string;
};

export async function createTransactions(inputs: TransactionCreateInput[]) {
  const results: BatchItemResult[] = [];

  for (let index = 0; index < inputs.length; index += 1) {
    try {
      const row = await createTransaction(inputs[index]);
      results.push({ inputIndex: index, success: true, id: row.id });
    } catch (error) {
      results.push({ inputIndex: index, success: false, error: (error as Error).message });
    }
  }

  const succeeded = results.filter((result) => result.success).length;
  return {
    summary: { total: inputs.length, succeeded, failed: inputs.length - succeeded },
    results,
  };
}

export type TransactionQuery = {
  accountId?: string;
  categoryId?: string;
  labelId?: string;
  from?: string;
  to?: string;
  paymentType?: PaymentType;
  limit?: number;
  offset?: number;
};

export async function listTransactions(query: TransactionQuery) {
  const db = getDb();
  const conditions = [];

  if (query.accountId) conditions.push(eq(transactions.accountId, query.accountId));
  if (query.categoryId) conditions.push(eq(transactions.categoryId, query.categoryId));
  if (query.paymentType) conditions.push(eq(transactions.paymentType, query.paymentType));
  if (query.labelId) {
    conditions.push(sql`${transactions.labelIds} @> ${JSON.stringify([query.labelId])}::jsonb`);
  }
  if (query.from) {
    conditions.push(gte(transactions.recordDate, new Date(`${query.from}T00:00:00.000Z`)));
  }
  if (query.to) {
    conditions.push(lte(transactions.recordDate, new Date(`${query.to}T23:59:59.999Z`)));
  }

  const limit = query.limit ?? 50;
  const offset = query.offset ?? 0;

  const rows = await db
    .select()
    .from(transactions)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(transactions.recordDate))
    .limit(limit)
    .offset(offset);

  return {
    transactions: rows,
    limit,
    offset,
    nextOffset: rows.length === limit ? offset + limit : null,
  };
}

export async function getTransaction(id: string) {
  const db = getDb();
  const [row] = await db.select().from(transactions).where(eq(transactions.id, id)).limit(1);
  return row ?? null;
}

export async function updateTransaction(id: string, input: Partial<TransactionCreateInput>) {
  const db = getDb();
  const [existing] = await db.select().from(transactions).where(eq(transactions.id, id)).limit(1);
  if (!existing) return null;

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  let amount = existing.amount;
  let currency = existing.currency;
  let recordDate = existing.recordDate;

  if (input.accountId !== undefined) patch.accountId = input.accountId;
  if (input.categoryId !== undefined) patch.categoryId = input.categoryId;
  if (input.note !== undefined) patch.note = input.note;
  if (input.paymentType !== undefined) patch.paymentType = input.paymentType;
  if (input.counterparty !== undefined) patch.counterparty = input.counterparty;
  if (input.labelIds !== undefined) patch.labelIds = input.labelIds;
  if (input.amount !== undefined) {
    amount = String(input.amount);
    patch.amount = amount;
  }
  if (input.currency !== undefined) {
    currency = input.currency.toUpperCase();
    patch.currency = currency;
  }
  if (input.recordDate !== undefined) {
    recordDate = parseDate(input.recordDate);
    patch.recordDate = recordDate;
  }

  const snapshotAffected =
    input.amount !== undefined || input.currency !== undefined || input.recordDate !== undefined;

  if (snapshotAffected) {
    const baseCurrency = getEnv().BASE_CURRENCY.toUpperCase();
    const { baseAmount, fxRateId } = await toBaseAmount(
      amount,
      currency,
      baseCurrency,
      recordDate,
    );
    patch.baseAmount = baseAmount;
    patch.baseCurrency = baseCurrency;
    patch.fxRateId = fxRateId;
  }

  const [row] = await db.update(transactions).set(patch).where(eq(transactions.id, id)).returning();
  return row ?? null;
}

export async function deleteTransaction(id: string) {
  const db = getDb();
  const [row] = await db.delete(transactions).where(eq(transactions.id, id)).returning();
  return row ?? null;
}
