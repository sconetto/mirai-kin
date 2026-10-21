import "dotenv/config";
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { closeDb, getDb } from "@/db";
import { accounts, budgets, insightAcknowledgements, transactions } from "@/db/schema";
import { listBudgetsWithSpend } from "./budgets";
import { acknowledgeInsight, getInsights } from "./insights";

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

  it("acknowledges an insight and resurfaces when the condition changes", async () => {
    const first = await getInsights();
    const over = first.find(
      (insight) => insight.type === "budget_over" && insight.data.budgetId === budgetId,
    );
    expect(over).toBeTruthy();
    if (!over) return;

    await acknowledgeInsight("budget_over", over.signature);

    const hidden = await getInsights();
    expect(
      hidden.some(
        (insight) => insight.type === "budget_over" && insight.data.budgetId === budgetId,
      ),
    ).toBe(false);

    const db = getDb();
    const budgetsWithSpend = await listBudgetsWithSpend();
    const spend = Number(
      budgetsWithSpend.find((budget) => budget.id === budgetId)?.spend ?? 0,
    );
    const newAmount = Math.max(1, spend / 0.9);
    await db.update(budgets).set({ amount: newAmount.toFixed(4) }).where(eq(budgets.id, budgetId));

    const resurfaced = await getInsights();
    expect(
      resurfaced.some(
        (insight) => insight.type === "budget_near" && insight.data.budgetId === budgetId,
      ),
    ).toBe(true);

    await db
      .delete(insightAcknowledgements)
      .where(
        and(
          eq(insightAcknowledgements.insightType, "budget_over"),
          eq(insightAcknowledgements.signature, over.signature),
        ),
      );
  });
});
