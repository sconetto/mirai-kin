import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { citationHref, resolveCitations } from "./assistant-citations";

describe("assistant citations", () => {
  it("resolves account, transaction, goal, and report citations", () => {
    const id = randomUUID();
    expect(citationHref({ type: "account", id, label: "Checking" })).toBe(
      `/accounts?account=${id}`,
    );
    expect(citationHref({ type: "transaction", id, label: "Coffee" })).toBe(
      `/spending/transactions?status=all#transaction-${id}`,
    );
    expect(citationHref({ type: "goal", id, label: "Emergency fund" })).toBe(
      `/planner#goal-${id}`,
    );
    expect(
      citationHref({
        type: "report",
        id: "cashflow:2026-01-01:2026-01-31",
        label: "Cashflow",
      }),
    ).toBe("/spending/reports?type=cashflow&from=2026-01-01&to=2026-01-31");
  });

  it("does not invent links for invalid ids or report ranges", () => {
    expect(citationHref({ type: "account", id: "not-an-id", label: "Bad" })).toBeNull();
    expect(
      citationHref({ type: "report", id: "cashflow:not-a-date:2026-01-31", label: "Bad" }),
    ).toBeNull();
  });

  it("resolves a citation list in place", () => {
    const id = randomUUID();
    const resolved = resolveCitations([{ type: "goal", id, label: "Goal" }]);
    expect(resolved[0]?.href).toBe(`/planner#goal-${id}`);
  });
});
