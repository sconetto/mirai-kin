import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { closeDb, getDb } from "@/db";
import { brokerageSales, investmentPositions } from "@/db/schema";
import { createAccount, deleteAccount } from "./accounts";
import { getTaxSummary } from "./tax";

describe.skipIf(!process.env.DATABASE_URL)("getTaxSummary (database)", () => {
  let accountId = "";
  let positionId = "";

  beforeAll(async () => {
    const db = getDb();
    const account = await createAccount({
      name: `TEST tax account ${randomUUID()}`,
      type: "investment",
      currency: "BRL",
    });
    accountId = account.id;
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
    if (accountId) await deleteAccount(accountId);
    await closeDb();
  });

  it("reports realized capital gains", async () => {
    const summary = await getTaxSummary(2026);
    expect(summary.capitalGains).toBeGreaterThanOrEqual(100);
  });
});
