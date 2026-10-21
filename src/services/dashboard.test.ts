import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { closeDb } from "@/db";
import { createGoal, deleteGoal } from "./planner";
import { getDashboard } from "./dashboard";

describe.skipIf(!process.env.DATABASE_URL)("dashboard view model", () => {
  let goalId = "";

  beforeAll(async () => {
    const goal = await createGoal({
      name: `TEST dashboard goal ${randomUUID()}`,
      type: "savings",
      targetAmount: "10000",
      currency: "BRL",
      fundingMode: "manual",
      manualCurrentAmount: "1000",
    });
    goalId = goal.id;
  });

  afterAll(async () => {
    if (goalId) await deleteGoal(goalId);
    await closeDb();
  });

  it("surfaces insufficient plan data instead of a positive verdict", async () => {
    const dashboard = await getDashboard("1y");
    const goal = dashboard.plan.goals.find((item) => item.id === goalId);
    expect(goal?.status).toBe("insufficient_data");
    expect(goal?.reason).toBe("missing_target_date");
  });

  it("returns a history-building view when no snapshots exist", async () => {
    const dashboard = await getDashboard("1y", new Date("2000-01-01T00:00:00.000Z"));
    expect(dashboard.history).toHaveLength(1);
    expect(dashboard.movement).toBeNull();
  });
});
