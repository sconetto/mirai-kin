import { describe, expect, it } from "vitest";
import { reportToCsv } from "./reports";
import type { Report } from "./reports";

const report: Report = {
  type: "cashflow",
  from: "2026-01-01",
  to: "2026-01-31",
  currency: "BRL",
  summary: { income: 100, expenses: 40, transfers: 0, net: 60, average: 60 },
  rows: [
    { key: "2026-01", label: "2026-01", income: 100, expenses: 40, transfers: 0, net: 60 },
  ],
};

describe("reportToCsv", () => {
  it("includes a summary row and the period rows", () => {
    const csv = reportToCsv(report);
    expect(csv).toContain("summary");
    expect(csv).toContain("2026-01");
    expect(csv.split("\n")).toHaveLength(3);
  });

  it("quotes values safely", () => {
    const csv = reportToCsv({
      ...report,
      rows: [{ ...report.rows[0], key: 'has,comma', label: 'has,comma' }],
    });
    expect(csv).toContain('"has,comma"');
  });
});
