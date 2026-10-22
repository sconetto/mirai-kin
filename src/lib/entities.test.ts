import { describe, expect, it } from "vitest";
import {
  appreciationSummary,
  creditCardSummary,
  dueSummary,
  loanSummary,
  monthlyEquivalent,
} from "./entities";

describe("entity derivations", () => {
  it("converts recurring amounts to a monthly equivalent", () => {
    expect(monthlyEquivalent(120, "yearly")).toBe(10);
    expect(monthlyEquivalent(100, "weekly")).toBeCloseTo(433.3333, 4);
  });

  it("derives a loan payment and payoff date", () => {
    const loan = loanSummary({
      kind: "loan",
      balance: 10_000,
      interestRate: 0.12,
      termMonths: 12,
      startDate: "2026-01-01",
    });
    expect(loan.monthlyPayment).toBeGreaterThan(0);
    expect(loan.payoffDate).toBe("2027-01-01");
    expect(loan.totalInterest).toBeGreaterThan(0);
  });

  it("derives appreciation for a property", () => {
    const result = appreciationSummary(
      500_000,
      0.05,
      "2021-01-01",
      new Date("2026-01-01T00:00:00.000Z"),
    );
    expect(result.currentValue).toBeGreaterThan(500_000);
    expect(result.gain).toBeGreaterThan(0);
  });

  it("derives credit-card utilization", () => {
    expect(creditCardSummary(2_500, 10_000)).toEqual({
      balance: 2_500,
      utilization: 0.25,
    });
  });

  it("derives the next due amount and days", () => {
    const due = dueSummary("2026-11-01", "monthly", 300, new Date("2026-10-22T00:00:00.000Z"));
    expect(due.monthlyEquivalent).toBe(300);
    expect(due.daysUntilDue).toBe(10);
  });
});
