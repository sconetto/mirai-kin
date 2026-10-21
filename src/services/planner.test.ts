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
      type: "savings",
      targetAmount: "10000",
      targetDate: "2027-01-01",
      currency: "BRL",
      fundingMode: "accounts",
      allocations: [{ accountId: accountA, sharePct: 40 }],
    });
    goalA = first.id;
    const second = await createGoal({
      name: `TEST shared goal B ${randomUUID()}`,
      type: "savings",
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
        type: "savings",
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
      type: "savings",
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

  it("evaluates purchase, debt, and income goal kinds", async () => {
    const ids: string[] = [];
    try {
      const purchase = await createGoal({
        name: `TEST purchase ${randomUUID()}`,
        type: "purchase",
        targetAmount: "500000",
        targetDate: "2028-01-01",
        currency: "BRL",
        fundingMode: "manual",
        manualCurrentAmount: "100000",
        monthlyContribution: "5000",
        expectedReturn: "0.06",
        inflationRate: "0.04",
        downPaymentPct: "20",
      });
      ids.push(purchase.id);
      const debt = await createGoal({
        name: `TEST debt ${randomUUID()}`,
        type: "debt",
        targetAmount: "20000",
        targetDate: "2027-01-01",
        currency: "BRL",
        manualCurrentAmount: "5000",
        monthlyContribution: "1000",
        interestRate: "0.12",
      });
      ids.push(debt.id);
      const income = await createGoal({
        name: `TEST income ${randomUUID()}`,
        type: "income",
        targetAmount: "15000",
        targetDate: "2028-01-01",
        currency: "BRL",
        manualCurrentAmount: "10000",
        monthlyContribution: "1000",
        expectedReturn: "0.05",
      });
      ids.push(income.id);

      const plan = await getPlanStatus();
      const purchaseGoal = plan.goals.find((goal) => goal.id === purchase.id);
      const debtGoal = plan.goals.find((goal) => goal.id === debt.id);
      const incomeGoal = plan.goals.find((goal) => goal.id === income.id);

      expect(purchaseGoal?.target).toBe(100000);
      expect(purchaseGoal?.purchasePrice).toBe(500000);
      expect(purchaseGoal?.financedAmount).toBe(400000);
      expect(purchaseGoal?.status).toBe("on_track");

      expect(debtGoal?.current).toBe(5000);
      expect(debtGoal?.target).toBe(20000);
      expect(debtGoal?.requiredMonthly).toBeGreaterThan(0);
      expect(debtGoal?.projected.base).toBeGreaterThan(0);

      expect(incomeGoal?.current).toBe(10000);
      expect(incomeGoal?.target).toBe(15000);
      expect(incomeGoal?.projected.base).toBeGreaterThan(10000);
      expect(incomeGoal?.status).not.toBe("insufficient_data");
    } finally {
      for (const id of ids) await deleteGoal(id);
    }
  });

  it("reports insufficient data without a target date", async () => {
    const goal = await createGoal({
      name: `TEST no date ${randomUUID()}`,
      type: "savings",
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
