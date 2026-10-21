import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { transactions, transfers } from "@/db/schema";
import type { Transaction } from "@/db/schema";
import { getBaseCurrency } from "./settings";
import { getAccount } from "./accounts";
import { toBaseAmount } from "./fx";

const DAY = 86_400_000;
const PAIR_WINDOW_DAYS = 3;

export class TransferValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TransferValidationError";
  }
}

export type TransferInput = {
  fromAccountId: string;
  toAccountId: string;
  amount: string | number;
  currency: string;
  counterAmount?: string | number;
  counterCurrency?: string;
  date: string;
  note?: string | null;
};

export async function createTransfer(input: TransferInput) {
  const db = getDb();
  const from = await getAccount(input.fromAccountId);
  const to = await getAccount(input.toAccountId);
  if (!from || !to) throw new TransferValidationError("Source or destination account not found");
  if (from.id === to.id) throw new TransferValidationError("Transfer accounts must differ");

  const date = new Date(input.date);
  if (Number.isNaN(date.getTime())) throw new TransferValidationError("Invalid transfer date");

  const amount = Math.abs(Number(input.amount));
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new TransferValidationError("Transfer amount must be positive");
  }

  const currency = input.currency.toUpperCase();
  const counterCurrency = (input.counterCurrency ?? to.currency).toUpperCase();

  let counterAmount: number;
  if (currency === counterCurrency) {
    counterAmount =
      input.counterAmount != null ? Math.abs(Number(input.counterAmount)) : amount;
  } else {
    if (input.counterAmount == null) {
      throw new TransferValidationError(
        "A counter amount is required for cross-currency transfers",
      );
    }
    counterAmount = Math.abs(Number(input.counterAmount));
  }

  if (!Number.isFinite(counterAmount) || counterAmount <= 0) {
    throw new TransferValidationError("Counter amount must be positive");
  }

  const rate = currency === counterCurrency ? 1 : counterAmount / amount;
  const baseCurrency = await getBaseCurrency();

  const outBase = await toBaseAmount(String(-amount), currency, baseCurrency, date);
  const inBase = await toBaseAmount(String(counterAmount), counterCurrency, baseCurrency, date);

  return db.transaction(async (tx) => {
    const [transfer] = await tx
      .insert(transfers)
      .values({
        date,
        fromAccountId: from.id,
        toAccountId: to.id,
        amount: amount.toFixed(4),
        currency,
        counterAmount: counterAmount.toFixed(4),
        counterCurrency,
        rate: rate.toFixed(10),
        note: input.note ?? null,
        status: "paired",
      })
      .returning();

    const [outLeg] = await tx
      .insert(transactions)
      .values({
        accountId: from.id,
        amount: (-amount).toFixed(4),
        currency,
        baseCurrency,
        baseAmount: outBase.baseAmount,
        fxRateId: outBase.fxRateId,
        recordDate: date,
        note: input.note ?? null,
        paymentType: "transfer",
        reviewStatus: "reviewed",
        transferId: transfer.id,
      })
      .returning();

    const [inLeg] = await tx
      .insert(transactions)
      .values({
        accountId: to.id,
        amount: counterAmount.toFixed(4),
        currency: counterCurrency,
        baseCurrency,
        baseAmount: inBase.baseAmount,
        fxRateId: inBase.fxRateId,
        recordDate: date,
        note: input.note ?? null,
        paymentType: "transfer",
        reviewStatus: "reviewed",
        transferId: transfer.id,
      })
      .returning();

    return { transfer, out: outLeg, in: inLeg };
  });
}

function splitLegs(a: Transaction, b: Transaction): { out: Transaction; in: Transaction } {
  if (a.accountId === b.accountId) {
    throw new TransferValidationError("Transfer accounts must differ");
  }
  if (a.transferId || b.transferId) {
    throw new TransferValidationError("One of the transactions is already part of a transfer");
  }
  if (Number(a.amount) < 0 && Number(b.amount) > 0) return { out: a, in: b };
  if (Number(b.amount) < 0 && Number(a.amount) > 0) return { out: b, in: a };
  throw new TransferValidationError("Transfer legs must have opposite signs");
}

export async function pairTransactions(firstId: string, secondId: string) {
  if (firstId === secondId) throw new TransferValidationError("Cannot pair a transaction with itself");
  const db = getDb();
  const [a] = await db.select().from(transactions).where(eq(transactions.id, firstId)).limit(1);
  const [b] = await db.select().from(transactions).where(eq(transactions.id, secondId)).limit(1);
  if (!a || !b) throw new TransferValidationError("Transaction not found");

  const { out, in: inbound } = splitLegs(a, b);
  const amount = Math.abs(Number(out.amount));
  const counterAmount = Math.abs(Number(inbound.amount));
  const rate = amount > 0 ? counterAmount / amount : 1;

  return db.transaction(async (tx) => {
    const [transfer] = await tx
      .insert(transfers)
      .values({
        date: out.recordDate,
        fromAccountId: out.accountId,
        toAccountId: inbound.accountId,
        amount: amount.toFixed(4),
        currency: out.currency,
        counterAmount: counterAmount.toFixed(4),
        counterCurrency: inbound.currency,
        rate: rate.toFixed(10),
        note: out.note ?? inbound.note ?? null,
        status: "paired",
      })
      .returning();

    await tx
      .update(transactions)
      .set({ transferId: transfer.id, paymentType: "transfer", reviewStatus: "reviewed" })
      .where(inArray(transactions.id, [out.id, inbound.id]));

    return transfer;
  });
}

export async function unpairTransfer(id: string) {
  const db = getDb();
  const [existing] = await db.select().from(transfers).where(eq(transfers.id, id)).limit(1);
  if (!existing) throw new TransferValidationError("Transfer not found");

  return db.transaction(async (tx) => {
    await tx
      .update(transactions)
      .set({ transferId: null })
      .where(eq(transactions.transferId, id));
    await tx.delete(transfers).where(eq(transfers.id, id));
    return existing;
  });
}

export async function listTransfers(limit = 100) {
  const db = getDb();
  return db.select().from(transfers).orderBy(desc(transfers.date)).limit(limit);
}

export async function getTransfer(id: string) {
  const db = getDb();
  const [transfer] = await db.select().from(transfers).where(eq(transfers.id, id)).limit(1);
  if (!transfer) return null;
  const legs = await db
    .select()
    .from(transactions)
    .where(eq(transactions.transferId, id))
    .orderBy(asc(transactions.recordDate));
  return { ...transfer, legs };
}

export async function backfillTransfers(ids?: string[]) {
  const db = getDb();
  const conditions = [
    isNull(transactions.transferId),
    eq(transactions.paymentType, "transfer"),
  ];
  if (ids?.length) conditions.push(inArray(transactions.id, ids));

  const rows = await db
    .select()
    .from(transactions)
    .where(and(...conditions))
    .orderBy(asc(transactions.recordDate));

  const used = new Set<string>();
  let paired = 0;

  for (const out of rows) {
    if (used.has(out.id) || Number(out.amount) >= 0) continue;
    const target = rows.find(
      (candidate) =>
        !used.has(candidate.id) &&
        candidate.id !== out.id &&
        candidate.accountId !== out.accountId &&
        Number(candidate.amount) > 0 &&
        candidate.currency === out.currency &&
        Math.abs(Number(candidate.amount) - Math.abs(Number(out.amount))) < 0.01 &&
        Math.abs(candidate.recordDate.getTime() - out.recordDate.getTime()) <=
          PAIR_WINDOW_DAYS * DAY,
    );
    if (!target) continue;

    await pairTransactions(out.id, target.id);
    used.add(out.id);
    used.add(target.id);
    paired += 1;
  }

  const unpaired = rows.filter((row) => !used.has(row.id)).length;
  return { paired, unpaired };
}
