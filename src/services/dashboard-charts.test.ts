import "dotenv/config";
import { afterAll, describe, expect, it } from "vitest";
import { closeDb } from "@/db";
import { getMonthlyInsights, parseMonth, shiftMonth } from "./dashboard-charts";

describe("month helpers", () => {
  it("parses valid months and falls back for invalid input", () => {
    expect(parseMonth("2026-10", "2026-01")).toBe("2026-10");
    expect(parseMonth("2026-13", "2026-01")).toBe("2026-01");
    expect(parseMonth(undefined, "2026-01")).toBe("2026-01");
  });

  it("shifts across year boundaries", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
  });
});

describe.skipIf(!process.env.DATABASE_URL)("monthly dashboard data", () => {
  afterAll(async () => {
    await closeDb();
  });

  it("returns a complete cash-flow and spending shape for an empty month", async () => {
    const result = await getMonthlyInsights("1900-01");
    expect(result.month).toBe("1900-01");
    expect(result.previousMonth).toBe("1899-12");
    expect(result.spending.points).toHaveLength(31);
    expect(result.spending.points[0]).toEqual({ day: 1, selected: expect.any(Number), previous: expect.any(Number) });
    expect(result.cashflow.income).toBeGreaterThanOrEqual(0);
    expect(result.cashflow.expenses).toBeGreaterThanOrEqual(0);
    expect(result.cashflow.incomeSources).toEqual([]);
    expect(result.cashflow.outcomes).toEqual([]);
  });
});
