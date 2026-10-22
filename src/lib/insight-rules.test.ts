import { describe, expect, it } from "vitest";
import {
  detectMilestone,
  detectSpendingAnomaly,
  idleCashExcess,
  subscriptionAudit,
} from "./insight-rules";

describe("insight rules", () => {
  it("detects idle cash above the months-of-expenses threshold", () => {
    expect(idleCashExcess(30_000, 5_000)).toBeNull();
    expect(idleCashExcess(40_000, 5_000)).toEqual({
      excess: 10_000,
      runwayMonths: 8,
    });
  });

  it("detects a crossed net-worth milestone", () => {
    expect(detectMilestone(765_000, 777_000)).toEqual({
      milestone: 770_000,
      step: 10_000,
    });
    expect(detectMilestone(777_000, 779_000)).toBeNull();
  });

  it("detects a spending anomaly against trailing volatility", () => {
    expect(detectSpendingAnomaly(200, [100, 100, 100])).toEqual({
      mean: 100,
      stddev: 0,
      threshold: 100,
    });
    expect(detectSpendingAnomaly(105, [100, 100, 100])).toBeNull();
    expect(detectSpendingAnomaly(115, [100, 110, 90])).toBeNull();
  });

  it("audits subscriptions and flags likely duplicates", () => {
    const audit = subscriptionAudit([
      { name: "Netflix", amount: 30, frequency: "monthly" },
      { name: "Netflix", amount: 30, frequency: "monthly" },
      { name: "Spotify", amount: 120, frequency: "yearly" },
    ]);
    expect(audit.count).toBe(3);
    expect(audit.monthlyTotal).toBe(70);
    expect(audit.duplicates).toContain("Netflix");
  });
});
