import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { accounts, transactions } from "@/db/schema";
import type { AccountCreateInput, AccountUpdateInput } from "@/lib/schemas";

export async function listAccounts(includeArchived = false) {
  const db = getDb();
  const query = db.select().from(accounts);
  const rows = includeArchived
    ? await query.orderBy(accounts.name)
    : await query.where(eq(accounts.archived, false)).orderBy(accounts.name);
  return rows;
}

export async function getAccount(id: string) {
  const db = getDb();
  const rows = await db.select().from(accounts).where(eq(accounts.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function createAccount(input: AccountCreateInput) {
  const db = getDb();
  const [row] = await db
    .insert(accounts)
    .values({
      name: input.name,
      type: input.type,
      currency: input.currency.toUpperCase(),
      openingBalance: input.openingBalance !== undefined ? String(input.openingBalance) : "0",
      openingBalanceCaptured: input.openingBalance !== undefined,
      statementCloseDay: input.statementCloseDay ?? null,
      dueDay: input.dueDay ?? null,
      creditLimit: input.creditLimit !== undefined && input.creditLimit !== null
        ? String(input.creditLimit)
        : null,
      archived: input.archived ?? false,
    })
    .returning();
  return row;
}

export async function updateAccount(id: string, input: AccountUpdateInput) {
  const db = getDb();
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (input.name !== undefined) patch.name = input.name;
  if (input.type !== undefined) patch.type = input.type;
  if (input.currency !== undefined) patch.currency = input.currency.toUpperCase();
  if (input.openingBalance !== undefined) patch.openingBalance = String(input.openingBalance);
  if (input.statementCloseDay !== undefined) patch.statementCloseDay = input.statementCloseDay;
  if (input.dueDay !== undefined) patch.dueDay = input.dueDay;
  if (input.creditLimit !== undefined) {
    patch.creditLimit = input.creditLimit === null ? null : String(input.creditLimit);
  }
  if (input.archived !== undefined) patch.archived = input.archived;

  const [row] = await db.update(accounts).set(patch).where(eq(accounts.id, id)).returning();
  return row ?? null;
}

export async function deleteAccount(id: string) {
  const db = getDb();
  const [row] = await db.delete(accounts).where(eq(accounts.id, id)).returning();
  return row ?? null;
}

export async function getAccountBalance(id: string) {
  const account = await getAccount(id);
  if (!account) return null;

  const db = getDb();
  const [aggregate] = await db
    .select({ total: sql<string>`coalesce(sum(${transactions.amount}), 0)` })
    .from(transactions)
    .where(eq(transactions.accountId, id));

  return {
    accountId: id,
    currency: account.currency,
    balance: (Number(account.openingBalance) + Number(aggregate?.total ?? 0)).toFixed(4),
  };
}

export async function listAccountBalances() {
  const db = getDb();
  const rows = await db
    .select({
      id: accounts.id,
      name: accounts.name,
      type: accounts.type,
      currency: accounts.currency,
      openingBalance: accounts.openingBalance,
      archived: accounts.archived,
      txTotal: sql<string>`coalesce(sum(${transactions.amount}), 0)`,
    })
    .from(accounts)
    .leftJoin(transactions, eq(transactions.accountId, accounts.id))
    .groupBy(accounts.id)
    .orderBy(accounts.name);

  return rows.map((row) => ({
    ...row,
    balance: (Number(row.openingBalance) + Number(row.txTotal)).toFixed(4),
  }));
}
