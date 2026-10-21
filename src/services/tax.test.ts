import "dotenv/config";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { closeDb, getDb } from "@/db";
import { accounts, brokerageSales, investmentPositions } from "@/db/schema";
import { getTaxSummary } from "./tax";

describe.skipIf(!process.env.DATABASE_URL)("getTaxSummary (database)", () => {
  let positionId = "";

  beforeAll(async () => {
    const db = getDb();
    const [account] = await db.select().from(accounts).limit(1);
    const [position] = await db
      .insert(investmentPositions)
      .values({
        accountId: account.id,
        symbol: "TEST",
        name: "TEST asset",
        instrumentType: "stock",
        quantity: "100",
        avgCost: "10",
        currency: "BRL",
      })
      .returning();
    positionId = position.id;

    await db.insert(brokerageSales).values({
      positionId,
      soldAt: "2026-06-15",
      quantity: "10",
      price: "20",
      fees: "0",
      currency: "BRL",
    });
  });

  afterAll(async () => {
    const db = getDb();
    await db.delete(investmentPositions).where(eq(investmentPositions.id, positionId));
    await closeDb();
  });

  it("reports realized capital gains", async () => {
    const summary = await getTaxSummary(2026);
    expect(summary.capitalGains).toBeGreaterThanOrEqual(100);
  });
});
