import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { accounts, transactions } from "@/db/schema";
import type { PaymentType } from "@/db/schema";
import { getBaseCurrency } from "./settings";
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
  const baseCurrency = await getBaseCurrency();
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
      isDeductible: input.isDeductible ?? false,
      reviewStatus: input.reviewStatus ?? "pending",
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
  reviewStatus?: "pending" | "reviewed" | "split";
  limit?: number;
  offset?: number;
};

export async function listTransactions(query: TransactionQuery) {
  const db = getDb();
  const conditions = [];

  if (query.accountId) conditions.push(eq(transactions.accountId, query.accountId));
  if (query.categoryId) conditions.push(eq(transactions.categoryId, query.categoryId));
  if (query.paymentType) conditions.push(eq(transactions.paymentType, query.paymentType));
  if (query.reviewStatus) {
    conditions.push(eq(transactions.reviewStatus, query.reviewStatus));
  } else {
    conditions.push(sql`${transactions.reviewStatus} <> 'split'`);
  }
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
  if (input.isDeductible !== undefined) patch.isDeductible = input.isDeductible;
  if (input.reviewStatus !== undefined) patch.reviewStatus = input.reviewStatus;
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
    const baseCurrency = await getBaseCurrency();
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

export async function bulkRecategorize(
  ids: string[],
  categoryId: string | null,
  markReviewed = true,
) {
  const db = getDb();
  await db
    .update(transactions)
    .set({
      categoryId,
      reviewStatus: markReviewed ? "reviewed" : "pending",
      updatedAt: new Date(),
    })
    .where(inArray(transactions.id, ids));
  return { updated: ids.length };
}

export async function markReviewed(ids: string[]) {
  const db = getDb();
  await db
    .update(transactions)
    .set({ reviewStatus: "reviewed", updatedAt: new Date() })
    .where(inArray(transactions.id, ids));
  return { updated: ids.length };
}

export async function mergeTransactions(primaryId: string, duplicateId: string) {
  if (primaryId === duplicateId) {
    throw new TransactionValidationError("Cannot merge a transaction with itself");
  }
  const db = getDb();
  const [primary] = await db
    .select()
    .from(transactions)
    .where(eq(transactions.id, primaryId))
    .limit(1);
  if (!primary) throw new TransactionValidationError("Primary transaction not found");

  await db.delete(transactions).where(eq(transactions.id, duplicateId));
  const [row] = await db
    .update(transactions)
    .set({ reviewStatus: "reviewed", updatedAt: new Date() })
    .where(eq(transactions.id, primaryId))
    .returning();
  return row ?? null;
}

export async function splitTransaction(
  id: string,
  parts: { amount: string | number; categoryId?: string | null; note?: string | null }[],
) {
  const db = getDb();
  const [original] = await db
    .select()
    .from(transactions)
    .where(eq(transactions.id, id))
    .limit(1);
  if (!original) throw new TransactionValidationError("Transaction not found");
  if (original.reviewStatus === "split") {
    throw new TransactionValidationError("Transaction is already split");
  }

  const total = parts.reduce((sum, part) => sum + Number(part.amount), 0);
  if (Math.abs(total - Number(original.amount)) > 0.01) {
    throw new TransactionValidationError("Split parts must sum to the original amount");
  }

  const baseCurrency = await getBaseCurrency();
  const created = [];

  for (const part of parts) {
    const amount = String(part.amount);
    const { baseAmount, fxRateId } = await toBaseAmount(
      amount,
      original.currency,
      baseCurrency,
      original.recordDate,
    );
    const [row] = await db
      .insert(transactions)
      .values({
        accountId: original.accountId,
        categoryId: part.categoryId ?? null,
        amount,
        currency: original.currency,
        baseCurrency,
        baseAmount,
        fxRateId,
        recordDate: original.recordDate,
        note: part.note ?? original.note,
        paymentType: original.paymentType,
        counterparty: original.counterparty,
        labelIds: original.labelIds,
        reviewStatus: "reviewed",
        parentTransactionId: original.id,
      })
      .returning();
    created.push(row);
  }

  await db
    .update(transactions)
    .set({ amount: "0", baseAmount: "0", reviewStatus: "split", updatedAt: new Date() })
    .where(eq(transactions.id, id));

  return created;
}
