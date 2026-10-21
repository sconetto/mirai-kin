import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { accounts, categories, transactions } from "@/db/schema";
import { getBaseCurrency } from "./settings";
import { resolveRate } from "@/services/fx";

export async function overview(limitRecent = 10) {
  const db = getDb();
  const baseCurrency = await getBaseCurrency();
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const monthEnd = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999),
  );

  const monthConditions = [
    gte(transactions.recordDate, monthStart),
    lte(transactions.recordDate, monthEnd),
    sql`${transactions.reviewStatus} <> 'split'`,
    sql`${transactions.transferId} is null`,
    sql`(${transactions.paymentType} is null or ${transactions.paymentType} <> 'transfer')`,
  ];

  const [monthAggregate] = await db
    .select({
      income: sql<string>`coalesce(sum(case when ${transactions.amount} > 0 then ${transactions.baseAmount} else 0 end), 0)`,
      expenses: sql<string>`coalesce(sum(case when ${transactions.amount} < 0 then -${transactions.baseAmount} else 0 end), 0)`,
    })
    .from(transactions)
    .where(and(...monthConditions));

  const spendingRows = await db
    .select({
      categoryId: categories.id,
      name: categories.name,
      nameEn: categories.nameEn,
      namePt: categories.namePt,
      color: categories.color,
      icon: categories.icon,
      total: sql<string>`coalesce(sum(case when ${transactions.amount} < 0 then -${transactions.baseAmount} else 0 end), 0)`,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(and(...monthConditions))
    .groupBy(
      categories.id,
      categories.name,
      categories.nameEn,
      categories.namePt,
      categories.color,
      categories.icon,
    );

  const recent = await db
    .select()
    .from(transactions)
    .orderBy(desc(transactions.recordDate))
    .limit(limitRecent);

  const accountRows = await db
    .select({
      id: accounts.id,
      name: accounts.name,
      type: accounts.type,
      currency: accounts.currency,
      openingBalance: accounts.openingBalance,
      txTotal: sql<string>`coalesce(sum(${transactions.amount}), 0)`,
    })
    .from(accounts)
    .leftJoin(transactions, eq(transactions.accountId, accounts.id))
    .where(eq(accounts.archived, false))
    .groupBy(accounts.id)
    .orderBy(accounts.name);

  const balances = [];
  for (const row of accountRows) {
    const native = (Number(row.openingBalance) + Number(row.txTotal)).toFixed(4);
    let baseBalance = native;
    if (row.currency !== baseCurrency) {
      try {
        const { rate } = await resolveRate(row.currency, baseCurrency, new Date());
        baseBalance = (Number(native) * Number(rate)).toFixed(4);
      } catch {
        baseBalance = native;
      }
    }
    balances.push({ ...row, balance: native, baseBalance });
  }

  const netWorth = balances.reduce((sum, row) => sum + Number(row.baseBalance), 0).toFixed(4);

  return {
    baseCurrency,
    netWorth,
    month: {
      income: monthAggregate?.income ?? "0",
      expenses: monthAggregate?.expenses ?? "0",
    },
    spendingByCategory: spendingRows
      .filter((row) => Number(row.total) > 0)
      .map((row) => ({
        categoryId: row.categoryId,
        name: row.name ?? "—",
        nameEn: row.nameEn,
        namePt: row.namePt,
        total: row.total,
        color: row.color,
        icon: row.icon,
      }))
      .sort((a, b) => Number(b.total) - Number(a.total)),
    recent,
    balances,
  };
}
