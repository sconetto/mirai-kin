import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { accounts, categories, dividends, transactions } from "@/db/schema";
import { listPositionsWithValue } from "./investments";
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
  const currency = input.currency.toUpperCase();

  if (input.externalSource && input.externalId) {
    const [existing] = await db
      .select()
      .from(accounts)
      .where(
        and(
          eq(accounts.externalSource, input.externalSource),
          eq(accounts.externalId, input.externalId),
        ),
      )
      .limit(1);
    if (existing) return existing;
  }

  const [existingByName] = await db
    .select()
    .from(accounts)
    .where(
      and(
        eq(accounts.name, input.name),
        eq(accounts.currency, currency),
        isNull(accounts.externalId),
      ),
    )
    .limit(1);
  if (existingByName) {
    if (input.externalSource && input.externalId) {
      const [adopted] = await db
        .update(accounts)
        .set({ externalSource: input.externalSource, externalId: input.externalId })
        .where(eq(accounts.id, existingByName.id))
        .returning();
      if (adopted) return adopted;
    }
    return existingByName;
  }

  const [row] = await db
    .insert(accounts)
    .values({
      name: input.name,
      type: input.type,
      ownershipType: input.ownershipType ?? "personal",
      assetSubtype: input.assetSubtype ?? null,
      currency,
      openingBalance: input.openingBalance !== undefined ? String(input.openingBalance) : "0",
      openingBalanceCaptured: input.openingBalance !== undefined,
      statementCloseDay: input.statementCloseDay ?? null,
      dueDay: input.dueDay ?? null,
      creditLimit: input.creditLimit !== undefined && input.creditLimit !== null
        ? String(input.creditLimit)
        : null,
      archived: input.archived ?? false,
      externalSource: input.externalSource,
      externalId: input.externalId,
    })
    .returning();
  return row;
}

export async function updateAccount(id: string, input: AccountUpdateInput) {
  const db = getDb();
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (input.name !== undefined) patch.name = input.name;
  if (input.type !== undefined) patch.type = input.type;
  if (input.ownershipType !== undefined) patch.ownershipType = input.ownershipType;
  if (input.assetSubtype !== undefined) patch.assetSubtype = input.assetSubtype;
  if (input.currency !== undefined) patch.currency = input.currency.toUpperCase();
  if (input.openingBalance !== undefined) patch.openingBalance = String(input.openingBalance);
  if (input.statementCloseDay !== undefined) patch.statementCloseDay = input.statementCloseDay;
  if (input.dueDay !== undefined) patch.dueDay = input.dueDay;
  if (input.creditLimit !== undefined) {
    patch.creditLimit = input.creditLimit === null ? null : String(input.creditLimit);
  }
  if (input.archived !== undefined) patch.archived = input.archived;
  if (input.externalSource !== undefined) patch.externalSource = input.externalSource;
  if (input.externalId !== undefined) patch.externalId = input.externalId;

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
      ownershipType: accounts.ownershipType,
      assetSubtype: accounts.assetSubtype,
      currency: accounts.currency,
      openingBalance: accounts.openingBalance,
      statementCloseDay: accounts.statementCloseDay,
      dueDay: accounts.dueDay,
      creditLimit: accounts.creditLimit,
      archived: accounts.archived,
      txTotal: sql<string>`coalesce(sum(${transactions.amount}), 0)`,
    })
    .from(accounts)
    .leftJoin(transactions, eq(transactions.accountId, accounts.id))
    .groupBy(accounts.id)
    .orderBy(accounts.name);

  return rows.map((row) => {
    const balance = Number(row.openingBalance) + Number(row.txTotal);
    const limit = row.creditLimit === null ? null : Number(row.creditLimit);
    const used = row.type === "credit_card" ? Math.max(0, -balance) : null;
    return {
      ...row,
      balance: balance.toFixed(4),
      creditUsed: used === null ? null : used.toFixed(4),
      creditAvailable:
        limit === null || used === null ? null : Math.max(0, limit - used).toFixed(4),
      creditUtilization:
        limit === null || limit <= 0 || used === null ? null : (used / limit) * 100,
    };
  });
}

const PASSIVE_INCOME_CATEGORIES = new Set([
  "Juros e Dividendos",
  "Interest & Dividends",
  "Rendimentos",
  "Earnings",
]);

/**
 * Average growth for savings/investment accounts. Positive inflows that are
 * not passive income count as invested capital; interest/dividends count as
 * natural income. Growth is the balance not explained by capital + withdrawals.
 */
export async function getAccountGrowth(accountId: string) {
  const account = await getAccount(accountId);
  if (!account || !["savings", "investment"].includes(account.type)) return null;
  if (
    account.type === "investment" &&
    account.assetSubtype &&
    !["stocks", "fiis", "crypto"].includes(account.assetSubtype)
  ) {
    return null;
  }

  const db = getDb();

  if (account.type === "investment") {
    const positions = (await listPositionsWithValue()).filter(
      (position) => position.accountId === accountId,
    );
    if (positions.length === 0) return null;

    const investedCapital = positions.reduce((sum, position) => sum + Number(position.cost), 0);
    const currentBalance = positions.reduce((sum, position) => sum + Number(position.value), 0);
    const dividendRows = await db
      .select({ amount: dividends.amount })
      .from(dividends)
      .where(inArray(dividends.positionId, positions.map((position) => position.id)));
    const naturalIncome = dividendRows.reduce((sum, row) => sum + Number(row.amount), 0);
    const firstDate = positions
      .map((position) => position.createdAt)
      .sort((a, b) => a.getTime() - b.getTime())[0];
    const months = Math.max(
      1,
      Math.round(((Date.now() - firstDate.getTime()) / (30.44 * 86_400_000)) * 10) / 10,
    );
    const growth = currentBalance - investedCapital;
    const growthPct = investedCapital > 0 ? (growth / investedCapital) * 100 : null;

    return {
      accountId,
      name: account.name,
      currency: account.currency,
      months,
      investedCapital: Number(investedCapital.toFixed(4)),
      currentBalance: Number(currentBalance.toFixed(4)),
      growth: Number(growth.toFixed(4)),
      growthPct: growthPct === null ? null : Number(growthPct.toFixed(2)),
      averageMonthlyGrowth: Number((growth / months).toFixed(4)),
      averageMonthlyGrowthPct: growthPct === null ? null : Number((growthPct / months).toFixed(2)),
      naturalIncome: Number(naturalIncome.toFixed(4)),
      averageMonthlyIncome: Number((naturalIncome / months).toFixed(4)),
    };
  }
  const rows = await db
    .select({
      amount: transactions.amount,
      recordDate: transactions.recordDate,
      categoryName: categories.name,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(
      and(
        eq(transactions.accountId, accountId),
        isNull(transactions.transferId),
        sql`(${transactions.paymentType} is null or ${transactions.paymentType} <> 'transfer')`,
      ),
    )
    .orderBy(transactions.recordDate);

  let contributions = 0;
  let withdrawals = 0;
  let naturalIncome = 0;
  for (const row of rows) {
    const amount = Number(row.amount);
    if (amount > 0) {
      if (row.categoryName && PASSIVE_INCOME_CATEGORIES.has(row.categoryName)) {
        naturalIncome += amount;
      } else {
        contributions += amount;
      }
    } else {
      withdrawals += Math.abs(amount);
    }
  }

  const firstDate = rows[0]?.recordDate ?? account.createdAt;
  const months = Math.max(
    1,
    Math.round(((Date.now() - firstDate.getTime()) / (30.44 * 86_400_000)) * 10) / 10,
  );
  const opening = Number(account.openingBalance);
  const investedCapital = opening + contributions;
  const currentBalance = opening + contributions + naturalIncome - withdrawals;
  const growth = currentBalance - investedCapital + withdrawals;
  const growthPct = investedCapital > 0 ? (growth / investedCapital) * 100 : null;

  return {
    accountId,
    name: account.name,
    currency: account.currency,
    months,
    investedCapital: Number(investedCapital.toFixed(4)),
    currentBalance: Number(currentBalance.toFixed(4)),
    growth: Number(growth.toFixed(4)),
    growthPct: growthPct === null ? null : Number(growthPct.toFixed(2)),
    averageMonthlyGrowth: Number((growth / months).toFixed(4)),
    averageMonthlyGrowthPct: growthPct === null ? null : Number((growthPct / months).toFixed(2)),
    naturalIncome: Number(naturalIncome.toFixed(4)),
    averageMonthlyIncome: Number((naturalIncome / months).toFixed(4)),
  };
}

export async function listAccountGrowth() {
  const accountsList = await listAccounts();
  const growth = [];
  for (const account of accountsList) {
    if (!["savings", "investment"].includes(account.type)) continue;
    const row = await getAccountGrowth(account.id);
    if (row) growth.push(row);
  }
  return growth.sort(
    (a, b) => (b.averageMonthlyGrowthPct ?? 0) - (a.averageMonthlyGrowthPct ?? 0),
  );
}
