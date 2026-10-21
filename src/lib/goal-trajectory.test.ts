import { describe, expect, it } from "vitest";
import {
  classifyGoalStatus,
  futureValue,
  monthsBetween,
  projectionRange,
  realAnnualReturn,
  requiredMonthlyContribution,
} from "./goal-trajectory";

describe("goal trajectory math", () => {
  it("derives a zero real return when nominal return equals inflation", () => {
    expect(realAnnualReturn(0.05, 0.05)).toBeCloseTo(0, 10);
  });

  it("uses simple accumulation when the real return is zero", () => {
    expect(futureValue(1000, 100, 0, 12)).toBeCloseTo(2200, 6);
  });

  it("computes required contribution with zero return", () => {
    expect(requiredMonthlyContribution(1000, 2200, 0, 12)).toBeCloseTo(100, 6);
  });

  it("returns zero required contribution when already funded", () => {
    expect(requiredMonthlyContribution(5000, 1000, 0.05, 12)).toBe(0);
  });

  it("returns no required contribution when a past target is underfunded", () => {
    expect(requiredMonthlyContribution(500, 1000, 0.05, 0)).toBeNull();
  });

  it("counts full months between dates", () => {
    expect(
      monthsBetween(new Date("2026-01-15T00:00:00.000Z"), new Date("2026-02-14T00:00:00.000Z")),
    ).toBe(0);
    expect(
      monthsBetween(new Date("2026-01-15T00:00:00.000Z"), new Date("2026-02-15T00:00:00.000Z")),
    ).toBe(1);
  });

  it("classifies on track when the conservative case succeeds", () => {
    const projections = projectionRange(1000, 0, 0.1, 0, 12);
    expect(projections).toEqual({
      conservative: 1080,
      base: 1100,
      optimistic: 1120,
    });
    expect(classifyGoalStatus(1000, projections).status).toBe("on_track");
  });

  it("classifies at risk when only the base case succeeds", () => {
    const projections = projectionRange(1000, 0, 0.1, 0, 12);
    expect(classifyGoalStatus(1090, projections).status).toBe("at_risk");
  });

  it("classifies off track when the base case misses", () => {
    const projections = projectionRange(1000, 0, 0.1, 0, 12);
    expect(classifyGoalStatus(1200, projections).status).toBe("off_track");
  });
});
