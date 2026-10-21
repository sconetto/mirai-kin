import { and, desc, eq, gte, isNull, lte, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  accountReconciliations,
  accounts,
  importRows,
  investmentPositions,
  investmentPrices,
  transactions,
} from "@/db/schema";
import type { ReconciliationStatus } from "@/db/schema";
import { getAccount } from "./accounts";
import { getBaseCurrency, getSettings, todayInTimeZone } from "./settings";

const DAY = 86_400_000;

function endOfDay(date: string): Date {
  return new Date(`${date.slice(0, 10)}T23:59:59.999Z`);
}

function dateInMonth(year: number, monthIndex: number, day: number): Date {
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, monthIndex, Math.min(day, lastDay)));
}

export async function computeBalance(accountId: string, date: string) {
  const account = await getAccount(accountId);
  if (!account) return null;

  const db = getDb();
  const [aggregate] = await db
    .select({ total: sql<string>`coalesce(sum(${transactions.amount}), 0)` })
    .from(transactions)
    .where(
      and(eq(transactions.accountId, accountId), lte(transactions.recordDate, endOfDay(date))),
    );

  return {
    account,
    computedBalance: (Number(account.openingBalance) + Number(aggregate?.total ?? 0)).toFixed(4),
  };
}

export async function reconcileAccount(input: {
  accountId: string;
  date: string;
  statementBalance: string | number;
  note?: string | null;
}) {
  const computed = await computeBalance(input.accountId, input.date);
  if (!computed) return null;

  const statement = Number(input.statementBalance);
  const difference = statement - Number(computed.computedBalance);
  const status: ReconciliationStatus = Math.abs(difference) < 0.005 ? "reconciled" : "discrepancy";

  const db = getDb();
  const [row] = await db
    .insert(accountReconciliations)
    .values({
      accountId: input.accountId,
      date: input.date.slice(0, 10),
      statementBalance: statement.toFixed(4),
      computedBalance: computed.computedBalance,
      difference: difference.toFixed(4),
      status,
      note: input.note ?? null,
    })
    .returning();

  return row;
}

export async function listReconciliations(accountId: string) {
  const db = getDb();
  return db
    .select()
    .from(accountReconciliations)
    .where(eq(accountReconciliations.accountId, accountId))
    .orderBy(desc(accountReconciliations.date), desc(accountReconciliations.createdAt));
}

export async function setOpeningBalance(accountId: string, openingBalance: string | number) {
  const db = getDb();
  const [row] = await db
    .update(accounts)
    .set({
      openingBalance: String(openingBalance),
      openingBalanceCaptured: true,
      updatedAt: new Date(),
    })
    .where(eq(accounts.id, accountId))
    .returning();
  return row ?? null;
}

/**
 * Applies an import-level balance instruction. A current balance is converted
 * to an opening balance by removing the transactions that were just imported.
 */
export async function applyImportBalance(input: {
  accountId: string;
  openingBalance?: string | number | null;
  currentBalance?: string | number | null;
  importedTotal: number;
}) {
  if (input.openingBalance !== undefined && input.openingBalance !== null) {
    return setOpeningBalance(input.accountId, input.openingBalance);
  }
  if (input.currentBalance !== undefined && input.currentBalance !== null) {
    const opening = Number(input.currentBalance) - input.importedTotal;
    return setOpeningBalance(input.accountId, opening.toFixed(4));
  }
  return null;
}

export async function getCreditCardCycle(accountId: string) {
  const account = await getAccount(accountId);
  if (!account || account.type !== "credit_card") return null;
  if (!account.statementCloseDay || !account.dueDay) return null;

  const settings = await getSettings();
  const today = todayInTimeZone(settings.timezone);
  const [year, month, day] = today.split("-").map(Number);

  const closeThisMonth = dateInMonth(year, month - 1, account.statementCloseDay);
  const close =
    day >= account.statementCloseDay
      ? closeThisMonth
      : dateInMonth(year, month - 2, account.statementCloseDay);
  const nextClose = dateInMonth(
    close.getUTCFullYear(),
    close.getUTCMonth() + 1,
    account.statementCloseDay,
  );
  const cycleStart = new Date(close.getTime() + DAY);
  const dueMonthOffset = account.dueDay > account.statementCloseDay ? 0 : 1;
  const dueDate = dateInMonth(
    nextClose.getUTCFullYear(),
    nextClose.getUTCMonth() + dueMonthOffset,
    account.dueDay,
  );

  const db = getDb();
  const rows = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.accountId, accountId),
        gte(transactions.recordDate, cycleStart),
        lte(transactions.recordDate, new Date(nextClose.getTime() + DAY - 1)),
      ),
    )
    .orderBy(desc(transactions.recordDate));

  const total = rows
    .filter((row) => Number(row.amount) < 0)
    .reduce((sum, row) => sum + Math.abs(Number(row.amount)), 0);

  return {
    account,
    cycleStart: cycleStart.toISOString().slice(0, 10),
    cycleEnd: nextClose.toISOString().slice(0, 10),
    dueDate: dueDate.toISOString().slice(0, 10),
    total: total.toFixed(4),
    transactions: rows,
  };
}

export async function getDataQuality() {
  const db = getDb();
  const baseCurrency = await getBaseCurrency();

  const [uncategorized] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(transactions)
    .where(
      and(
        isNull(transactions.categoryId),
        sql`${transactions.reviewStatus} <> 'split'`,
        isNull(transactions.transferId),
      ),
    );

  const duplicateDate = sql<string>`to_char(${transactions.recordDate} at time zone 'UTC', 'YYYY-MM-DD')`;
  const duplicateRows = await db
    .select({
      accountId: transactions.accountId,
      date: duplicateDate,
      amount: transactions.amount,
      note: transactions.note,
      count: sql<number>`count(*)::int`,
    })
    .from(transactions)
    .where(sql`${transactions.reviewStatus} <> 'split'`)
    .groupBy(transactions.accountId, duplicateDate, transactions.amount, transactions.note)
    .having(sql`count(*) > 1`)
    .limit(20);
  const duplicates = duplicateRows.reduce((sum, row) => sum + Number(row.count), 0);

  const [unpairedTransfers] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(transactions)
    .where(
      and(
        isNull(transactions.transferId),
        sql`${transactions.paymentType} = 'transfer'`,
        sql`${transactions.reviewStatus} <> 'split'`,
      ),
    );

  const [missingFx] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(transactions)
    .where(
      and(
        sql`${transactions.currency} <> ${baseCurrency}`,
        isNull(transactions.fxRateId),
        sql`${transactions.reviewStatus} <> 'split'`,
      ),
    );

  const staleCutoff = new Date(Date.now() - 30 * DAY).toISOString().slice(0, 10);
  const staleRows = await db
    .select({ id: investmentPositions.id })
    .from(investmentPositions)
    .leftJoin(
      investmentPrices,
      and(
        eq(investmentPrices.positionId, investmentPositions.id),
        gte(investmentPrices.date, staleCutoff),
      ),
    )
    .where(and(eq(investmentPositions.closed, false), isNull(investmentPrices.id)));

  const [withoutOpening] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(accounts)
    .where(and(eq(accounts.archived, false), eq(accounts.openingBalanceCaptured, false)));

  const [importErrors] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(importRows)
    .where(sql`${importRows.error} is not null and ${importRows.status} <> 'committed'`);

  return {
    baseCurrency,
    counts: {
      uncategorized: Number(uncategorized?.count ?? 0),
      duplicates,
      unpairedTransfers: Number(unpairedTransfers?.count ?? 0),
      missingFx: Number(missingFx?.count ?? 0),
      stalePrices: staleRows.length,
      accountsWithoutOpeningBalance: Number(withoutOpening?.count ?? 0),
      importRowsWithErrors: Number(importErrors?.count ?? 0),
    },
    samples: {
      duplicates: duplicateRows.slice(0, 10),
    },
    links: {
      uncategorized: "/spending/transactions?uncategorized=1",
      duplicates: "/spending/transactions?duplicates=1",
      unpairedTransfers: "/spending/transfers",
      missingFx: "/spending/transactions?missingFx=1",
      stalePrices: "/invest",
      accountsWithoutOpeningBalance: "/accounts",
      importRowsWithErrors: "/import",
    },
  };
}

export async function getUnpairedTransfers() {
  const db = getDb();
  return db
    .select({
      id: transactions.id,
      accountId: transactions.accountId,
      accountName: accounts.name,
      amount: transactions.amount,
      currency: transactions.currency,
      recordDate: transactions.recordDate,
      note: transactions.note,
      counterparty: transactions.counterparty,
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .where(
      and(
        isNull(transactions.transferId),
        sql`${transactions.paymentType} = 'transfer'`,
        sql`${transactions.reviewStatus} <> 'split'`,
      ),
    )
    .orderBy(desc(transactions.recordDate))
    .limit(100);
}
