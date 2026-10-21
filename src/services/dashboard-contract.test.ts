import "dotenv/config";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { closeDb, getDb } from "@/db";
import { fxRates, netWorthSnapshots } from "@/db/schema";
import { createAccount, deleteAccount } from "./accounts";
import { getDashboard } from "./dashboard";
import { createGoal, deleteGoal } from "./planner";
import { createTransfer } from "./transfers";

describe.skipIf(!process.env.DATABASE_URL)("dashboard contract fields", () => {
  let sourceId = "";
  let destinationId = "";
  let goalId = "";

  beforeAll(async () => {
    const source = await createAccount({
      name: `TEST dashboard source ${randomUUID()}`,
      type: "checking",
      currency: "BRL",
      openingBalance: "10000",
    });
    sourceId = source.id;
    const destination = await createAccount({
      name: `TEST dashboard destination ${randomUUID()}`,
      type: "savings",
      currency: "BRL",
      openingBalance: "0",
    });
    destinationId = destination.id;

    const goal = await createGoal({
      name: `TEST tracked goal ${randomUUID()}`,
      type: "custom",
      targetAmount: "50000",
      targetDate: "2027-12-31",
      currency: "BRL",
      fundingMode: "accounts",
      allocations: [{ accountId: destinationId, sharePct: 100 }],
      monthlyContribution: "100",
    });
    goalId = goal.id;

    await createTransfer({
      fromAccountId: sourceId,
      toAccountId: destinationId,
      amount: "500",
      currency: "BRL",
      date: new Date().toISOString(),
      note: "TEST tracked contribution",
    });
  });

  afterAll(async () => {
    if (goalId) await deleteGoal(goalId);
    if (destinationId) await deleteAccount(destinationId);
    if (sourceId) await deleteAccount(sourceId);
    await closeDb();
  });

  it("uses tracked transfers for contribution pace", async () => {
    const dashboard = await getDashboard("6m");
    expect(dashboard.pace?.source).toBe("tracked");
    expect(dashboard.pace?.actualTotal).toBeGreaterThanOrEqual(500);
  });

  it("reports the rate date and trajectory horizon", async () => {
    const dashboard = await getDashboard("plan");
    expect(dashboard.plan.rateDate).toBe(dashboard.plan.asOf);
    expect(dashboard.plan.goals.find((goal) => goal.id === goalId)?.rateDate).toBe(
      dashboard.plan.asOf,
    );
    expect(dashboard.assumptions.horizonMonths).toBe(120);
  });

  it("separates FX from market movement when native values exist", async () => {
    const db = getDb();
    await db.insert(fxRates).values({
      base: "USD",
      quote: "BRL",
      rate: "5.2",
      date: "2099-01-02",
      source: "test",
    });
    await db.insert(netWorthSnapshots).values([
      {
        date: "2099-01-01",
        assets: "1000",
        liabilities: "0",
        net: "1000",
        currency: "BRL",
        breakdown: {
          components: [
            {
              kind: "asset",
              type: "checking",
              label: "TEST USD",
              value: 1000,
              nativeValue: 1000,
              currency: "USD",
            },
          ],
        },
      },
      {
        date: "2099-01-02",
        assets: "5200",
        liabilities: "0",
        net: "5200",
        currency: "BRL",
        breakdown: {
          components: [
            {
              kind: "asset",
              type: "checking",
              label: "TEST USD",
              value: 5200,
              nativeValue: 1000,
              currency: "USD",
            },
          ],
        },
      },
    ]);

    try {
      const dashboard = await getDashboard("1m", new Date("2099-01-03T00:00:00.000Z"));
      expect(dashboard.movement?.fxSeparated).toBe(true);
      expect(dashboard.movement?.fx).toBeCloseTo(4200, 2);
      expect(dashboard.movement?.market).toBeCloseTo(0, 2);
    } finally {
      await db.delete(netWorthSnapshots).where(eq(netWorthSnapshots.date, "2099-01-01"));
      await db.delete(netWorthSnapshots).where(eq(netWorthSnapshots.date, "2099-01-02"));
      await db.delete(fxRates).where(eq(fxRates.date, "2099-01-02"));
    }
  });
});
