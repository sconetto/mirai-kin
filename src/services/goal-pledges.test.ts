import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { closeDb, getDb } from "@/db";
import { transfers } from "@/db/schema";
import type { GoalCreateInput } from "@/lib/schemas";
import { createAccount, deleteAccount } from "./accounts";
import {
  createGoalPledge,
  deleteGoalPledge,
  expireGoalPledges,
  listGoalPledges,
  updateGoalPledge,
} from "./goal-pledges";
import { createGoal, deleteGoal, getPlanStatus } from "./planner";

describe.skipIf(!process.env.DATABASE_URL)("goal pledges", () => {
  const goalIds: string[] = [];
  const accountIds: string[] = [];

  afterAll(async () => {
    for (const id of goalIds) await deleteGoal(id);
    for (const id of accountIds) await deleteAccount(id);
    await closeDb();
  });

  async function makeGoal(overrides: Partial<GoalCreateInput> = {}) {
    const goal = await createGoal({
      name: `TEST pledge goal ${randomUUID()}`,
      type: "savings",
      targetAmount: "10000",
      targetDate: "2028-01-01",
      currency: "BRL",
      fundingMode: "manual",
      manualCurrentAmount: "1000",
      monthlyContribution: "0",
      expectedReturn: "0",
      inflationRate: "0",
      ...overrides,
    });
    goalIds.push(goal.id);
    return goal;
  }

  it("creates, fulfills, and deletes a pledge", async () => {
    const goal = await makeGoal();
    const pledge = await createGoalPledge({
      goalId: goal.id,
      amount: "250",
      currency: "BRL",
      dueDate: "2027-06-01",
      notes: "Bonus",
    });

    expect(pledge.status).toBe("open");
    expect(pledge.amount).toBe("250.0000");
    expect(pledge.notes).toBe("Bonus");

    const listed = await listGoalPledges(goal.id);
    expect(listed.map((row) => row.id)).toContain(pledge.id);

    const fulfilled = await updateGoalPledge(pledge.id, { status: "fulfilled" });
    expect(fulfilled?.status).toBe("fulfilled");

    const deleted = await deleteGoalPledge(pledge.id);
    expect(deleted?.id).toBe(pledge.id);
    expect(await listGoalPledges(goal.id)).toHaveLength(0);
  });

  it("expires pledges once their due date passes", async () => {
    const goal = await makeGoal();
    const pledge = await createGoalPledge({
      goalId: goal.id,
      amount: "300",
      currency: "BRL",
      dueDate: "2027-03-01",
    });

    await expireGoalPledges(new Date("2027-04-01T00:00:00.000Z"));
    const [row] = await listGoalPledges(goal.id);
    expect(row.id).toBe(pledge.id);
    expect(row.status).toBe("expired");
  });

  it("includes open pledges in the projected funding and excludes expired ones", async () => {
    const goal = await makeGoal();
    const before = await getPlanStatus(new Date("2026-10-22T00:00:00.000Z"));
    const beforeGoal = before.goals.find((item) => item.id === goal.id);
    expect(beforeGoal).toBeTruthy();

    const pledge = await createGoalPledge({
      goalId: goal.id,
      amount: "500",
      currency: "BRL",
      dueDate: "2027-06-01",
    });

    const after = await getPlanStatus(new Date("2026-10-22T00:00:00.000Z"));
    const afterGoal = after.goals.find((item) => item.id === goal.id);
    expect(afterGoal?.pledged).toBe(500);
    expect(afterGoal?.pledges.some((item) => item.id === pledge.id)).toBe(true);
    expect((afterGoal?.projected.base ?? 0) - (beforeGoal?.projected.base ?? 0)).toBeCloseTo(
      500,
      2,
    );

    await updateGoalPledge(pledge.id, { status: "expired" });
    const expired = await getPlanStatus(new Date("2026-10-22T00:00:00.000Z"));
    const expiredGoal = expired.goals.find((item) => item.id === goal.id);
    expect(expiredGoal?.pledged).toBe(0);
    expect(expiredGoal?.projected.base).toBeCloseTo(beforeGoal?.projected.base ?? 0, 2);
  });

  it("flags transfers out of a goal-linked account but ignores internal transfers", async () => {
    const source = await createAccount({
      name: `TEST pledge source ${randomUUID()}`,
      type: "savings",
      currency: "BRL",
      openingBalance: "5000",
    });
    const outside = await createAccount({
      name: `TEST pledge outside ${randomUUID()}`,
      type: "checking",
      currency: "BRL",
      openingBalance: "0",
    });
    const internal = await createAccount({
      name: `TEST pledge internal ${randomUUID()}`,
      type: "savings",
      currency: "BRL",
      openingBalance: "0",
    });
    accountIds.push(source.id, outside.id, internal.id);

    const goal = await makeGoal({
      fundingMode: "accounts",
      manualCurrentAmount: null,
      allocations: [
        { accountId: source.id, sharePct: 50 },
        { accountId: internal.id, sharePct: 50 },
      ],
    });

    const db = getDb();
    const date = new Date();
    await db.insert(transfers).values([
      {
        fromAccountId: source.id,
        toAccountId: outside.id,
        amount: "200",
        currency: "BRL",
        counterAmount: "200",
        counterCurrency: "BRL",
        rate: "1",
        date,
        status: "paired",
      },
      {
        fromAccountId: source.id,
        toAccountId: internal.id,
        amount: "50",
        currency: "BRL",
        counterAmount: "50",
        counterCurrency: "BRL",
        rate: "1",
        date,
        status: "paired",
      },
    ]);

    const plan = await getPlanStatus(new Date());
    const status = plan.goals.find((item) => item.id === goal.id);
    expect(status?.withdrawals).toHaveLength(1);
    expect(status?.withdrawalTotal).toBeCloseTo(200, 2);
    expect(status?.withdrawals[0]?.toAccountId).toBe(outside.id);
  });
});
