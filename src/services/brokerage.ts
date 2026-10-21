import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  accounts,
  brokerageSales,
  dividends,
  investmentPositions,
} from "@/db/schema";
import { listPositionsWithValue } from "./investments";

export async function getBrokerageSummary() {
  const db = getDb();
  const [positions, accountRows, salesRows, dividendRows] = await Promise.all([
    listPositionsWithValue(),
    db.select({ id: accounts.id, name: accounts.name }).from(accounts),
    db
      .select({
        id: brokerageSales.id,
        symbol: investmentPositions.symbol,
        soldAt: brokerageSales.soldAt,
        quantity: brokerageSales.quantity,
        price: brokerageSales.price,
        fees: brokerageSales.fees,
        avgCost: investmentPositions.avgCost,
        currency: brokerageSales.currency,
      })
      .from(brokerageSales)
      .innerJoin(investmentPositions, eq(brokerageSales.positionId, investmentPositions.id)),
    db.select().from(dividends),
  ]);

  const accountName = new Map(accountRows.map((row) => [row.id, row.name]));

  const sales = salesRows.map((sale) => ({
    ...sale,
    gain:
      Number(sale.quantity) * (Number(sale.price) - Number(sale.avgCost)) - Number(sale.fees),
  }));

  const allocationBy = (keyOf: (position: (typeof positions)[number]) => string) => {
    const totals = new Map<string, number>();
    let total = 0;
    for (const position of positions) {
      const value = Number(position.value);
      total += value;
      const key = keyOf(position);
      totals.set(key, (totals.get(key) ?? 0) + value);
    }
    return [...totals.entries()]
      .map(([key, value]) => ({
        key,
        value: Number(value.toFixed(2)),
        share: total > 0 ? Number(((value / total) * 100).toFixed(2)) : 0,
      }))
      .sort((a, b) => b.value - a.value);
  };

  return {
    positions,
    sales,
    dividends: dividendRows,
    realizedGains: Number(sales.reduce((sum, sale) => sum + sale.gain, 0).toFixed(4)),
    dividendTotal: Number(dividendRows.reduce((sum, row) => sum + Number(row.amount), 0).toFixed(4)),
    allocation: {
      byInstrument: allocationBy((position) => position.instrumentType),
      byCurrency: allocationBy((position) => position.currency),
      byAccount: allocationBy((position) => accountName.get(position.accountId) ?? position.accountId),
    },
  };
}
