import { describe, expect, it } from "vitest";
import { addMonths, buildPriceSchedule, buildSacSchedule } from "./amortization";

describe("addMonths", () => {
  it("clamps to the last day of the target month", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
  });

  it("handles year rollover", () => {
    expect(addMonths("2026-12-15", 1)).toBe("2027-01-15");
  });
});

describe("Price schedule", () => {
  const rows = buildPriceSchedule({
    principal: 12_000,
    annualRate: 0.12,
    term: 12,
    startDate: "2026-01-01",
    method: "price",
  });

  it("produces one row per period", () => {
    expect(rows).toHaveLength(12);
  });

  it("keeps payments roughly constant", () => {
    const payments = rows.map((row) => row.payment);
    expect(Math.max(...payments) - Math.min(...payments)).toBeLessThan(0.02);
  });

  it("grows the principal portion over time", () => {
    expect(rows[rows.length - 1].principal).toBeGreaterThan(rows[0].principal);
  });

  it("ends with a zero balance", () => {
    expect(rows[rows.length - 1].balance).toBe(0);
  });
});

describe("SAC schedule", () => {
  const rows = buildSacSchedule({
    principal: 12_000,
    annualRate: 0.12,
    term: 12,
    startDate: "2026-01-01",
    method: "sac",
  });

  it("keeps the principal portion constant", () => {
    const principals = rows.slice(0, -1).map((row) => row.principal);
    expect(Math.max(...principals) - Math.min(...principals)).toBeLessThan(0.01);
  });

  it("declines the payment over time", () => {
    expect(rows[0].payment).toBeGreaterThan(rows[rows.length - 1].payment);
  });

  it("ends with a zero balance", () => {
    expect(rows[rows.length - 1].balance).toBe(0);
  });
});

describe("zero-interest loans", () => {
  it("splits the principal evenly with Price", () => {
    const rows = buildPriceSchedule({
      principal: 1_200,
      annualRate: 0,
      term: 12,
      startDate: "2026-01-01",
      method: "price",
    });
    expect(rows[0].payment).toBeCloseTo(100, 2);
    expect(rows[rows.length - 1].balance).toBe(0);
  });
});
