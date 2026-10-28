import "dotenv/config";
import { afterAll, describe, expect, it } from "vitest";
import { closeDb } from "@/db";
import { buildCashflowGraph } from "@/lib/cashflow-graph";
import {
  buildCashflow,
  getMonthlyInsights,
  groupSmallCategories,
  parseMonth,
  shiftMonth,
  type MonthlyCashflow,
  type MonthlyCategory,
} from "./dashboard-charts";

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

describe("category grouping", () => {
  const category = (
    id: string,
    total: number,
    children: MonthlyCategory[] = [],
  ): MonthlyCategory => ({
    id,
    name: id,
    nameEn: id,
    namePt: id,
    total,
    color: null,
    icon: null,
    children,
  });

  it("groups categories below the threshold into Other", () => {
    const grouped = groupSmallCategories([
      category("rent", 96),
      category("coffee", 2),
      category("fees", 2),
    ]);
    expect(grouped).toHaveLength(2);
    expect(grouped[0]?.name).toBe("rent");
    expect(grouped[1]).toMatchObject({
      name: "Other",
      total: 4,
      children: [{ name: "coffee" }, { name: "fees" }],
    });
  });

  it("leaves categories above the threshold untouched", () => {
    const items = [category("rent", 60), category("food", 30), category("transport", 10)];
    expect(groupSmallCategories(items)).toBe(items);
  });

  it("keeps surplus outside the capped expense bucket", () => {
    const expenses = Array.from({ length: 7 }, (_, index) =>
      category(`expense-${index}`, 10),
    );
    const cashflow = buildCashflow(
      [{ categoryId: null, income: "120", expenses: "70" }],
      [category("salary", 120)],
      expenses,
    );

    const surplus = cashflow.outcomes.find((outcome) => outcome.id === "surplus");
    expect(surplus?.total).toBe(50);
    expect(cashflow.outcomes.at(-1)?.id).toBe("surplus");
    const other = cashflow.outcomes.find((outcome) => outcome.id === "other-expense");
    expect(other?.children.some((child) => child.id === "surplus")).toBe(false);
  });

  it("exposes parent and child graph stages from cashflow categories", () => {
    const food = category("food", 100, [category("groceries", 100)]);
    const data: MonthlyCashflow = {
      income: 100,
      expenses: 100,
      surplus: 0,
      savingsDraw: 0,
      incomeSources: [category("salary", 100)],
      expenseCategories: [food],
      outcomes: [food],
    };
    const graph = buildCashflowGraph(data, { hub: "Hub", direct: "Direct" }, (item) => item.name);

    expect(graph.nodes.filter((node) => node.kind === "parent")).toHaveLength(1);
    expect(graph.nodes.filter((node) => node.kind === "child")).toHaveLength(1);
    expect(graph.nodes.find((node) => node.kind === "hub")?.depth).toBe(1);
    expect(graph.links.filter((link) => link.kind === "child")).toHaveLength(1);
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
