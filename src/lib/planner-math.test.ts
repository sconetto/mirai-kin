import { describe, expect, it } from "vitest";
import { emergencyRunway, requiredMonthlyContribution } from "./planner-math";

describe("emergencyRunway", () => {
  it("divides liquid assets by essential monthly spend", () => {
    expect(emergencyRunway(30_000, 5_000)).toBe(6);
  });

  it("returns zero when essential spend is zero", () => {
    expect(emergencyRunway(30_000, 0)).toBe(0);
  });
});

describe("requiredMonthlyContribution", () => {
  it("splits the target evenly with no return", () => {
    expect(requiredMonthlyContribution(12_000, 0, 12, 0)).toBeCloseTo(1_000, 2);
  });

  it("returns zero when the goal is already met", () => {
    expect(requiredMonthlyContribution(12_000, 12_000, 12, 0.06)).toBe(0);
  });

  it("requires less per month when a return is assumed", () => {
    expect(requiredMonthlyContribution(12_000, 0, 12, 0.06)).toBeLessThan(1_000);
  });
});
