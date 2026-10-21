import { and, eq, gte, lte, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  brokerageSales,
  categories,
  dividends,
  investmentPositions,
  transactions,
} from "@/db/schema";

export async function getTaxSummary(year: number) {
  const db = getDb();
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T23:59:59.999Z`);

  const incomeRows = await db
    .select({
      category: sql<string>`coalesce(${categories.name}, 'Uncategorized')`,
      nameEn: categories.nameEn,
      namePt: categories.namePt,
      total: sql<string>`coalesce(sum(${transactions.baseAmount}), 0)`,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(
      and(
        gte(transactions.recordDate, start),
        lte(transactions.recordDate, end),
        sql`${transactions.amount} > 0`,
        sql`${transactions.reviewStatus} <> 'split'`,
      ),
    )
    .groupBy(categories.name, categories.nameEn, categories.namePt)
    .orderBy(sql`sum(${transactions.baseAmount}) desc`);

  const [deductible] = await db
    .select({ total: sql<string>`coalesce(sum(-${transactions.baseAmount}), 0)` })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(
      and(
        gte(transactions.recordDate, start),
        lte(transactions.recordDate, end),
        sql`${transactions.amount} < 0`,
        sql`${transactions.reviewStatus} <> 'split'`,
        sql`(${transactions.isDeductible} = true or ${categories.taxTreatment} = 'deductible')`,
      ),
    );

  const sales = await db
    .select({
      quantity: brokerageSales.quantity,
      price: brokerageSales.price,
      fees: brokerageSales.fees,
      avgCost: investmentPositions.avgCost,
    })
    .from(brokerageSales)
    .innerJoin(investmentPositions, eq(brokerageSales.positionId, investmentPositions.id))
    .where(and(gte(brokerageSales.soldAt, startDate), lte(brokerageSales.soldAt, endDate)));

  const capitalGains = sales.reduce(
    (sum, sale) =>
      sum +
      Number(sale.quantity) * (Number(sale.price) - Number(sale.avgCost)) -
      Number(sale.fees),
    0,
  );

  const [dividendTotal] = await db
    .select({ total: sql<string>`coalesce(sum(${dividends.amount}), 0)` })
    .from(dividends)
    .where(and(gte(dividends.date, startDate), lte(dividends.date, endDate)));

  return {
    year,
    income: incomeRows.map((row) => ({
      category: row.category,
      nameEn: row.nameEn,
      namePt: row.namePt,
      total: Number(row.total),
    })),
    deductible: Number(deductible?.total ?? 0),
    capitalGains: Number(capitalGains.toFixed(4)),
    dividends: Number(dividendTotal?.total ?? 0),
  };
}
