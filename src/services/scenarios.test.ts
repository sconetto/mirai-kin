import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { closeDb, getDb } from "@/db";
import { scenarios } from "@/db/schema";
import {
  comparePlanScenarios,
  createScenario,
  deleteScenario,
  duplicateScenario,
  listScenarios,
  ScenarioValidationError,
  seedScenariosIfEmpty,
  setDefaultScenario,
  updateScenario,
} from "./scenarios";

describe.skipIf(!process.env.DATABASE_URL)("scenario lab", () => {
  beforeAll(async () => {
    await getDb().delete(scenarios);
    await seedScenariosIfEmpty();
  });

  afterAll(async () => {
    await getDb().delete(scenarios);
    await closeDb();
  });

  it("seeds base, optimistic, and pessimistic scenarios", async () => {
    const rows = await listScenarios();
    expect(rows).toHaveLength(3);
    expect(rows.find((row) => row.isDefault)?.name).toBe("Base");
  });

  it("creates, edits, duplicates, and changes the default", async () => {
    const created = await createScenario({
      name: "TEST scenario",
      assumptions: { expectedReturn: 0.04, horizonMonths: 240 },
    });
    expect(created.isDefault).toBe(false);

    const overridden = await comparePlanScenarios();
    const custom = overridden.scenarios.find((scenario) => scenario.id === created.id);
    const seededBase = overridden.scenarios.find((scenario) => scenario.name === "Base");
    expect(custom?.overrides).toEqual({ expectedReturn: 0.04, horizonMonths: 240 });
    expect(custom?.assumptions.expectedReturn).toBe(0.04);
    expect(custom?.assumptions.horizonMonths).toBe(240);
    expect(custom?.assumptions.monthlyContribution).toBe(
      seededBase?.assumptions.monthlyContribution,
    );

    const updated = await updateScenario(created.id, {
      name: "TEST scenario updated",
      assumptions: { monthlyContribution: 500 },
    });
    expect(updated?.name).toBe("TEST scenario updated");
    const afterUpdate = await comparePlanScenarios();
    const inherited = afterUpdate.scenarios.find((scenario) => scenario.id === created.id);
    const baseAfterUpdate = afterUpdate.scenarios.find((scenario) => scenario.name === "Base");
    expect(inherited?.assumptions.monthlyContribution).toBe(500);
    expect(inherited?.assumptions.expectedReturn).toBe(
      baseAfterUpdate?.assumptions.expectedReturn,
    );

    await setDefaultScenario(created.id);
    const rows = await listScenarios();
    expect(rows.find((row) => row.id === created.id)?.isDefault).toBe(true);

    const copy = await duplicateScenario(created.id);
    expect(copy?.name).toContain("copy");
    expect(copy?.id).not.toBe(created.id);
  });

  it("requires a replacement when deleting the default", async () => {
    const rows = await listScenarios();
    const defaultScenario = rows.find((row) => row.isDefault);
    const replacement = rows.find((row) => !row.isDefault);
    expect(defaultScenario).toBeTruthy();
    expect(replacement).toBeTruthy();
    if (!defaultScenario || !replacement) return;

    await expect(deleteScenario(defaultScenario.id)).rejects.toBeInstanceOf(
      ScenarioValidationError,
    );
    await deleteScenario(defaultScenario.id, replacement.id);
    const after = await listScenarios();
    expect(after.find((row) => row.id === replacement.id)?.isDefault).toBe(true);
  });

  it("orders and shapes comparisons consistently", async () => {
    const first = await comparePlanScenarios();
    const second = await comparePlanScenarios();
    expect(first.scenarios[0]?.isDefault).toBe(true);
    expect(first.scenarios.map((scenario) => scenario.id)).toEqual(
      second.scenarios.map((scenario) => scenario.id),
    );
    expect(first.scenarios.every((scenario) => Number.isFinite(scenario.totalNet))).toBe(true);
  });
});
