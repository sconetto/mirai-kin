import "dotenv/config";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { closeDb, getDb } from "@/db";
import { accounts, categories, transactions } from "@/db/schema";
import type { TransactionRule } from "@/db/schema";
import { createAccount } from "./accounts";
import { applyRules, createRule, deleteRule, firstMatch, previewRules } from "./rules";

describe("rule matching", () => {
  const rules = [
    {
      id: "low",
      name: "Low",
      priority: 200,
      enabled: true,
      conditions: { counterparty: { operator: "contains", value: "market" } },
      actions: { categoryId: "low-cat" },
    },
    {
      id: "high",
      name: "High",
      priority: 10,
      enabled: true,
      conditions: { counterparty: { operator: "contains", value: "market" } },
      actions: { categoryId: "high-cat" },
    },
  ] as unknown as TransactionRule[];

  it("uses priority order and the first match", () => {
    const match = firstMatch(
      { accountId: "account", amount: "-10", counterparty: "Corner Market" },
      rules,
    );
    expect(match?.ruleId).toBe("high");
    expect(match?.actions.categoryId).toBe("high-cat");
  });

  it("requires all conditions to match", () => {
    const match = firstMatch(
      { accountId: "account", amount: "-10", counterparty: "Pharmacy" },
      rules,
    );
    expect(match).toBeNull();
  });
});

describe.skipIf(!process.env.DATABASE_URL)("rules (database)", () => {
  let accountId = "";
  let ruleId = "";
  let transactionId = "";

  beforeAll(async () => {
    const db = getDb();
    const [category] = await db.select().from(categories).limit(1);
    const account = await createAccount({
      name: "TEST rules account",
      type: "checking",
      currency: "BRL",
      openingBalance: "0",
    });
    accountId = account.id;

    const rule = await createRule({
      name: "TEST rules counterparty",
      priority: 5,
      conditions: { counterparty: { operator: "contains", value: "TEST rules market" } },
      actions: { categoryId: category.id, markReviewed: true },
    });
    ruleId = rule.id;

    const [transaction] = await db
      .insert(transactions)
      .values({
        accountId,
        amount: "-15",
        currency: "BRL",
        baseCurrency: "BRL",
        baseAmount: "-15",
        recordDate: new Date(),
        note: "TEST rules",
        counterparty: "TEST rules market",
        reviewStatus: "pending",
      })
      .returning();
    transactionId = transaction.id;
  });

  afterAll(async () => {
    const db = getDb();
    await db.delete(accounts).where(eq(accounts.id, accountId));
    if (ruleId) await deleteRule(ruleId);
    await closeDb();
  });

  it("previews matches without writing", async () => {
    const today = new Date().toISOString().slice(0, 10);
    const preview = await previewRules({ from: today, to: today });
    expect(preview.matched).toBeGreaterThanOrEqual(1);
    expect(preview.matches.some((match) => match.transactionId === transactionId)).toBe(true);
  });

  it("applies the rule and records traceability", async () => {
    const today = new Date().toISOString().slice(0, 10);
    const result = await applyRules({ from: today, to: today });
    expect(result.updated).toBeGreaterThanOrEqual(1);

    const db = getDb();
    const [row] = await db.select().from(transactions).where(eq(transactions.id, transactionId));
    expect(row.appliedRuleId).toBe(ruleId);
    expect(row.reviewStatus).toBe("reviewed");
    expect(row.categoryId).toBeTruthy();
  });
});
