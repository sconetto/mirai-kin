import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { closeDb } from "@/db";
import { createAccount, deleteAccount } from "./accounts";
import { acknowledgeInsight, getInsights } from "./insights";
import { createGoal, deleteGoal, updateGoal } from "./planner";

describe.skipIf(!process.env.DATABASE_URL)("goal trajectory insights", () => {
  let accountId = "";
  let goalId = "";

  beforeAll(async () => {
    const account = await createAccount({
      name: `TEST goal insight account ${randomUUID()}`,
      type: "savings",
      currency: "BRL",
      openingBalance: "0",
    });
    accountId = account.id;
    const goal = await createGoal({
      name: `TEST goal insight ${randomUUID()}`,
      type: "savings",
      targetAmount: "10000",
      targetDate: "2027-01-01",
      currency: "BRL",
      fundingMode: "manual",
      manualCurrentAmount: "0",
      monthlyContribution: "0",
    });
    goalId = goal.id;
  });

  afterAll(async () => {
    if (goalId) await deleteGoal(goalId);
    if (accountId) await deleteAccount(accountId);
    await closeDb();
  });

  it("acknowledges an off-track goal and resurfaces when the gap changes", async () => {
    const first = await getInsights();
    const insight = first.find(
      (item) => item.type === "goal_off_track" && item.data.goalId === goalId,
    );
    expect(insight).toBeTruthy();
    if (!insight) return;

    await acknowledgeInsight("goal_off_track", insight.signature);
    const hidden = await getInsights();
    expect(
      hidden.some((item) => item.type === "goal_off_track" && item.data.goalId === goalId),
    ).toBe(false);

    await updateGoal(goalId, { targetAmount: "20000" });
    const resurfaced = await getInsights();
    expect(
      resurfaced.some((item) => item.type === "goal_off_track" && item.data.goalId === goalId),
    ).toBe(true);
  });
});
