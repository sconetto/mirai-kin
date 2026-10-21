import { describe, expect, it } from "vitest";
import {
  DEFAULT_DASHBOARD_RANGE,
  historyMonths,
  paceMonths,
  parseDashboardRange,
  projectionMonths,
  shiftMonths,
} from "./dashboard-range";

describe("dashboard ranges", () => {
  it("uses a year as the default", () => {
    expect(parseDashboardRange(undefined)).toBe(DEFAULT_DASHBOARD_RANGE);
    expect(DEFAULT_DASHBOARD_RANGE).toBe("1y");
  });

  it("accepts valid ranges and rejects unknown values", () => {
    expect(parseDashboardRange("1m")).toBe("1m");
    expect(parseDashboardRange("plan")).toBe("plan");
    expect(parseDashboardRange("bogus")).toBe("1y");
    expect(parseDashboardRange(["6m", "1y"])).toBe("6m");
  });

  it("maps history and projection windows", () => {
    expect(historyMonths("1m")).toBe(1);
    expect(historyMonths("all")).toBeNull();
    expect(projectionMonths("1m")).toBe(12);
    expect(projectionMonths("plan")).toBe(120);
    expect(paceMonths("6m")).toBe(6);
    expect(paceMonths("plan")).toBe(12);
  });

  it("shifts months across year boundaries", () => {
    expect(shiftMonths(new Date("2026-01-15T00:00:00.000Z"), -1).toISOString()).toBe(
      "2025-12-15T00:00:00.000Z",
    );
  });
});
