import "dotenv/config";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { closeDb, getDb } from "@/db";
import { accounts, budgets, transactions } from "@/db/schema";
import { getInsights } from "./insights";

describe.skipIf(!process.env.DATABASE_URL)("getInsights (database)", () => {
  let budgetId = "";
  let transactionId = "";
  let accountId = "";

  beforeAll(async () => {
    const db = getDb();
    const [account] = await db.select().from(accounts).limit(1);
    accountId = account.id;
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
      .toISOString()
      .slice(0, 10);

    const [budget] = await db
      .insert(budgets)
      .values({
        name: "Test budget",
        periodType: "monthly",
        startDate: start,
        amount: "1",
        currency: "BRL",
      })
      .returning();
    budgetId = budget.id;

    const [transaction] = await db
      .insert(transactions)
      .values({
        accountId,
        amount: "-100",
        currency: "BRL",
        baseCurrency: "BRL",
        baseAmount: "-100",
        recordDate: now,
        reviewStatus: "reviewed",
      })
      .returning();
    transactionId = transaction.id;
  });

  afterAll(async () => {
    const db = getDb();
    await db.delete(transactions).where(eq(transactions.id, transactionId));
    await db.delete(budgets).where(eq(budgets.id, budgetId));
    await closeDb();
  });

  it("produces a budget-overrun insight", async () => {
    const insights = await getInsights();
    expect(
      insights.some(
        (insight) => insight.type === "budget_over" && insight.data.budgetId === budgetId,
      ),
    ).toBe(true);
  });
});
