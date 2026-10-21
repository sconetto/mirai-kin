import { asc, desc, eq, ne, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { scenarios } from "@/db/schema";
import {
  scenarioAssumptionsSchema,
  type ScenarioAssumptionsInput,
  type ScenarioCreateInput,
  type ScenarioUpdateInput,
} from "@/lib/schemas";
import {
  planTrajectory,
  type PlanAssumptionOverrides,
  type PlanTrajectory,
} from "./projections";

const MAX_SCENARIOS = 20;

export type EffectiveAssumptions = {
  expectedReturn: number;
  inflation: number;
  monthlyContribution: number;
  horizonMonths: number;
  returnBand: number;
};

export type ScenarioComparison = {
  id: string;
  name: string;
  isDefault: boolean;
  overrides: ScenarioAssumptionsInput;
  assumptions: EffectiveAssumptions;
  trajectory: PlanTrajectory;
  totalNet: number;
};

export class ScenarioValidationError extends Error {
  fields?: string[];

  constructor(message: string, fields?: string[]) {
    super(message);
    this.name = "ScenarioValidationError";
    this.fields = fields;
  }
}

function parseOverrides(value: unknown): ScenarioAssumptionsInput {
  const parsed = scenarioAssumptionsSchema.safeParse(value ?? {});
  return parsed.success ? parsed.data : {};
}

function validateAssumptions(value: ScenarioAssumptionsInput | undefined) {
  const parsed = scenarioAssumptionsSchema.safeParse(value ?? {});
  if (!parsed.success) {
    throw new ScenarioValidationError(
      parsed.error.issues.map((issue) => issue.message).join("; "),
      parsed.error.issues.map((issue) => issue.path.join(".") || "assumptions"),
    );
  }
  return parsed.data;
}

async function baseAssumptions(asOf: Date): Promise<EffectiveAssumptions> {
  const base = await planTrajectory(120, asOf);
  return base.assumptions;
}

function mergeAssumptions(
  base: EffectiveAssumptions,
  overrides: ScenarioAssumptionsInput,
): EffectiveAssumptions {
  return {
    expectedReturn: overrides.expectedReturn ?? base.expectedReturn,
    inflation: overrides.inflation ?? base.inflation,
    monthlyContribution: overrides.monthlyContribution ?? base.monthlyContribution,
    horizonMonths: overrides.horizonMonths ?? base.horizonMonths,
    returnBand: base.returnBand,
  };
}

async function assertUniqueName(name: string, excludeId?: string) {
  const db = getDb();
  const rows = await db
    .select({ id: scenarios.id, name: scenarios.name })
    .from(scenarios);
  const normalized = name.trim().toLowerCase();
  const conflict = rows.find(
    (row) => row.id !== excludeId && row.name.trim().toLowerCase() === normalized,
  );
  if (conflict) throw new ScenarioValidationError("Scenario name already exists", ["name"]);
}

async function countScenarios(): Promise<number> {
  const rows = await getDb().select({ id: scenarios.id }).from(scenarios);
  return rows.length;
}

async function makeDefault(id: string) {
  const db = getDb();
  await db.transaction(async (tx) => {
    await tx.update(scenarios).set({ isDefault: false }).where(ne(scenarios.id, id));
    await tx.update(scenarios).set({ isDefault: true }).where(eq(scenarios.id, id));
  });
}

export async function seedScenariosIfEmpty(asOf = new Date()): Promise<void> {
  const db = getDb();
  if ((await countScenarios()) > 0) return;
  const base = await baseAssumptions(asOf);

  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('scenarios.seed'))`);
    const [count] = await tx
      .select({ total: sql<number>`count(*)::int` })
      .from(scenarios);
    if ((count?.total ?? 0) > 0) return;

    await tx.insert(scenarios).values([
      { name: "Base", assumptions: {}, isDefault: true },
      {
        name: "Optimistic",
        assumptions: { expectedReturn: base.expectedReturn + 0.02 },
        isDefault: false,
      },
      {
        name: "Pessimistic",
        assumptions: { expectedReturn: Math.max(-0.99, base.expectedReturn - 0.02) },
        isDefault: false,
      },
    ]);
  });
}

export async function listScenarios(asOf = new Date()) {
  await seedScenariosIfEmpty(asOf);
  return getDb()
    .select()
    .from(scenarios)
    .orderBy(desc(scenarios.isDefault), asc(scenarios.name));
}

export async function getScenario(id: string) {
  const [row] = await getDb().select().from(scenarios).where(eq(scenarios.id, id)).limit(1);
  return row ?? null;
}

export async function getDefaultScenario(asOf = new Date()) {
  const rows = await listScenarios(asOf);
  return rows.find((row) => row.isDefault) ?? rows[0] ?? null;
}

export async function createScenario(input: ScenarioCreateInput) {
  const name = input.name.trim();
  if (!name) throw new ScenarioValidationError("Scenario name is required", ["name"]);
  const assumptions = validateAssumptions(input.assumptions);
  await assertUniqueName(name);
  const total = await countScenarios();
  if (total >= MAX_SCENARIOS) {
    throw new ScenarioValidationError(`At most ${MAX_SCENARIOS} scenarios are supported`);
  }

  const db = getDb();
  return db.transaction(async (tx) => {
    const isDefault = input.isDefault ?? total === 0;
    if (isDefault) {
      await tx.update(scenarios).set({ isDefault: false });
    }
    return (
      await tx
        .insert(scenarios)
        .values({ name, assumptions, isDefault })
        .returning()
    )[0];
  });
}

export async function updateScenario(id: string, input: ScenarioUpdateInput) {
  const existing = await getScenario(id);
  if (!existing) return null;
  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) throw new ScenarioValidationError("Scenario name is required", ["name"]);
    await assertUniqueName(name, id);
  }
  if (input.isDefault === false && existing.isDefault) {
    throw new ScenarioValidationError("Choose another scenario as default", ["isDefault"]);
  }
  const assumptions =
    input.assumptions !== undefined ? validateAssumptions(input.assumptions) : undefined;

  return getDb().transaction(async (tx) => {
    if (input.isDefault) {
      await tx.update(scenarios).set({ isDefault: false }).where(ne(scenarios.id, id));
    }
    const [row] = await tx
      .update(scenarios)
      .set({
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(assumptions !== undefined ? { assumptions } : {}),
        ...(input.isDefault !== undefined ? { isDefault: input.isDefault } : {}),
      })
      .where(eq(scenarios.id, id))
      .returning();
    return row ?? null;
  });
}

export async function setDefaultScenario(id: string) {
  const existing = await getScenario(id);
  if (!existing) return null;
  await makeDefault(id);
  return getScenario(id);
}

export async function duplicateScenario(id: string) {
  const existing = await getScenario(id);
  if (!existing) return null;
  if ((await countScenarios()) >= MAX_SCENARIOS) {
    throw new ScenarioValidationError(`At most ${MAX_SCENARIOS} scenarios are supported`);
  }
  const rows = await listScenarios();
  let name = `${existing.name} (copy)`;
  let suffix = 2;
  while (rows.some((row) => row.name.toLowerCase() === name.toLowerCase())) {
    name = `${existing.name} (copy ${suffix})`;
    suffix += 1;
  }
  return createScenario({ name, assumptions: parseOverrides(existing.assumptions) });
}

export async function deleteScenario(id: string, replacementDefaultId?: string) {
  const rows = await listScenarios();
  if (rows.length <= 1) {
    throw new ScenarioValidationError("At least one scenario must remain");
  }
  const target = rows.find((row) => row.id === id);
  if (!target) return null;
  if (target.isDefault) {
    if (!replacementDefaultId || replacementDefaultId === id) {
      throw new ScenarioValidationError("Choose a replacement default scenario", [
        "replacementDefaultId",
      ]);
    }
    if (!rows.some((row) => row.id === replacementDefaultId)) {
      throw new ScenarioValidationError("Replacement scenario not found", [
        "replacementDefaultId",
      ]);
    }
  }

  const db = getDb();
  return db.transaction(async (tx) => {
    if (target.isDefault && replacementDefaultId) {
      await tx.update(scenarios).set({ isDefault: true }).where(eq(scenarios.id, replacementDefaultId));
    }
    const [row] = await tx.delete(scenarios).where(eq(scenarios.id, id)).returning();
    return row ?? null;
  });
}

export async function comparePlanScenarios(asOf = new Date()) {
  const rows = await listScenarios(asOf);
  const base = await baseAssumptions(asOf);
  const results: ScenarioComparison[] = [];
  for (const row of rows) {
    const overrides = parseOverrides(row.assumptions);
    const assumptions = mergeAssumptions(base, overrides);
    const trajectory = await planTrajectory(assumptions.horizonMonths, asOf, {
      expectedReturn: assumptions.expectedReturn,
      inflation: assumptions.inflation,
      monthlyContribution: assumptions.monthlyContribution,
      horizonMonths: assumptions.horizonMonths,
    } satisfies PlanAssumptionOverrides);
    results.push({
      id: row.id,
      name: row.name,
      isDefault: row.isDefault,
      overrides,
      assumptions,
      trajectory,
      totalNet: trajectory.points[trajectory.points.length - 1]?.base ?? 0,
    });
  }
  return {
    asOf: asOf.toISOString().slice(0, 10),
    baseCurrency: results[0]?.trajectory.baseCurrency ?? "BRL",
    defaultScenarioId: rows.find((row) => row.isDefault)?.id ?? null,
    scenarios: results,
  };
}
