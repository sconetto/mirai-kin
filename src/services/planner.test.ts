import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { closeDb } from "@/db";
import { createAccount, deleteAccount } from "./accounts";
import { createGoal, deleteGoal, getPlanStatus, GoalValidationError } from "./planner";
import { resolveRate } from "./fx";
import { getBaseCurrency } from "./settings";

describe.skipIf(!process.env.DATABASE_URL)("goal plan status", () => {
  let accountA = "";
  let accountB = "";
  let goalA = "";
  let goalB = "";
  let goalC = "";
  let goalD = "";

  beforeAll(async () => {
    const a = await createAccount({
      name: `TEST goal account A ${randomUUID()}`,
      type: "savings",
      currency: "BRL",
      openingBalance: "1000",
    });
    accountA = a.id;
    const b = await createAccount({
      name: `TEST goal account B ${randomUUID()}`,
      type: "savings",
      currency: "BRL",
      openingBalance: "1000",
    });
    accountB = b.id;
  });

  afterAll(async () => {
    for (const id of [goalA, goalB, goalC, goalD]) {
      if (id) await deleteGoal(id);
    }
    await deleteAccount(accountA);
    await deleteAccount(accountB);
    await closeDb();
  });

  it("supports shared account allocations", async () => {
    const first = await createGoal({
      name: `TEST shared goal A ${randomUUID()}`,
      type: "custom",
      targetAmount: "10000",
      targetDate: "2027-01-01",
      currency: "BRL",
      fundingMode: "accounts",
      allocations: [{ accountId: accountA, sharePct: 40 }],
    });
    goalA = first.id;
    const second = await createGoal({
      name: `TEST shared goal B ${randomUUID()}`,
      type: "custom",
      targetAmount: "10000",
      targetDate: "2027-01-01",
      currency: "BRL",
      fundingMode: "accounts",
      allocations: [{ accountId: accountA, sharePct: 60 }],
    });
    goalB = second.id;

    const plan = await getPlanStatus();
    expect(plan.goals.find((goal) => goal.id === goalA)?.current).toBe(400);
    expect(plan.goals.find((goal) => goal.id === goalB)?.current).toBe(600);
  });

  it("rejects allocations beyond 100% of an account", async () => {
    await expect(
      createGoal({
        name: `TEST over allocated ${randomUUID()}`,
        type: "custom",
        targetAmount: "10000",
        targetDate: "2027-01-01",
        currency: "BRL",
        fundingMode: "accounts",
        allocations: [{ accountId: accountA, sharePct: 20 }],
      }),
    ).rejects.toBeInstanceOf(GoalValidationError);
  });

  it("converts a multi-currency goal into the base currency", async () => {
    const goal = await createGoal({
      name: `TEST multi currency ${randomUUID()}`,
      type: "custom",
      targetAmount: "2000",
      targetDate: "2027-01-01",
      currency: "USD",
      fundingMode: "manual",
      manualCurrentAmount: "1000",
      monthlyContribution: "100",
    });
    goalD = goal.id;

    const now = new Date();
    const baseCurrency = await getBaseCurrency();
    const expected = 1000 * Number((await resolveRate("USD", baseCurrency, now)).rate);
    const plan = await getPlanStatus(now);
    const status = plan.goals.find((item) => item.id === goalD);
    expect(status?.goalCurrency).toBe("USD");
    expect(status?.currency).toBe(baseCurrency);
    expect(status?.current).toBeCloseTo(expected, 2);
  });

  it("reports insufficient data without a target date", async () => {
    const goal = await createGoal({
      name: `TEST no date ${randomUUID()}`,
      type: "custom",
      targetAmount: "10000",
      currency: "BRL",
      fundingMode: "accounts",
      allocations: [{ accountId: accountB, sharePct: 100 }],
    });
    goalC = goal.id;

    const plan = await getPlanStatus();
    const status = plan.goals.find((item) => item.id === goalC);
    expect(status?.status).toBe("insufficient_data");
    expect(status?.reason).toBe("missing_target_date");
  });
});
