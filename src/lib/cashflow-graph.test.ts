import { describe, expect, it } from "vitest";
import { buildCashflowGraph, type CashflowGraphLabels } from "./cashflow-graph";
import { groupSmallCategories, type MonthlyCategory, type MonthlyCashflow } from "@/services/dashboard-charts";

const labels: CashflowGraphLabels = { hub: "Cash flow", direct: "Direct" };

function category(
  id: string,
  total: number,
  children: MonthlyCategory[] = [],
): MonthlyCategory {
  return {
    id,
    name: id,
    nameEn: id,
    namePt: id,
    total,
    color: null,
    icon: null,
    children,
  };
}

function cashflow(overrides: Partial<MonthlyCashflow> = {}): MonthlyCashflow {
  return {
    income: 100,
    expenses: 100,
    surplus: 0,
    savingsDraw: 0,
    incomeSources: [category("salary", 100)],
    expenseCategories: [],
    outcomes: [],
    ...overrides,
  };
}

const localize = (item: MonthlyCategory) => item.name;

describe("buildCashflowGraph", () => {
  it("renders parent and child stages and reconciles direct parent spending", () => {
    const food = category("food", 100, [category("groceries", 60), category("restaurants", 30)]);
    const graph = buildCashflowGraph(
      cashflow({ expenseCategories: [food], outcomes: [food] }),
      labels,
      localize,
    );

    const parent = graph.nodes.find((node) => node.kind === "parent" && node.name === "food");
    expect(parent).toBeTruthy();
    if (!parent) return;

    const children = graph.nodes.filter(
      (node) => node.kind === "child" && node.parentId === parent.id,
    );
    expect(children.map((child) => child.name)).toEqual(["groceries", "restaurants", "Direct"]);
    expect(children.reduce((sum, child) => sum + child.total, 0)).toBe(100);
    expect(children.find((child) => child.name === "Direct")?.total).toBe(10);

    const childLinks = graph.links.filter((link) => link.kind === "child");
    expect(childLinks.reduce((sum, link) => sum + link.value, 0)).toBe(100);
  });

  it("orders parents by amount and children by amount within each parent", () => {
    const small = category("small", 10, [category("small-child", 10)]);
    const large = category("large", 90, [
      category("large-small", 30),
      category("large-big", 60),
    ]);
    const graph = buildCashflowGraph(
      cashflow({ expenseCategories: [small, large], outcomes: [small, large] }),
      labels,
      localize,
    );

    const parents = graph.nodes
      .filter((node) => node.kind === "parent")
      .map((node) => node.name);
    expect(parents).toEqual(["large", "small"]);

    const largeChildren = graph.nodes
      .filter((node) => node.kind === "child" && node.parentId === "outcome:large")
      .map((node) => node.name);
    expect(largeChildren).toEqual(["large-big", "large-small"]);
  });

  it("keeps a parent without children as a leaf", () => {
    const rent = category("rent", 100);
    const graph = buildCashflowGraph(
      cashflow({ expenseCategories: [rent], outcomes: [rent] }),
      labels,
      localize,
    );

    expect(graph.nodes.some((node) => node.kind === "parent" && node.name === "rent")).toBe(true);
    expect(graph.nodes.some((node) => node.kind === "child")).toBe(false);
    expect(graph.links.filter((link) => link.kind === "child")).toHaveLength(0);
  });

  it("keeps surplus as a leaf outcome", () => {
    const surplus = category("surplus", 20);
    const graph = buildCashflowGraph(
      cashflow({ expenses: 80, surplus: 20, outcomes: [surplus] }),
      labels,
      localize,
    );

    const node = graph.nodes.find((item) => item.id === "outcome:surplus");
    expect(node?.kind).toBe("outcome");
    expect(graph.nodes.some((item) => item.kind === "child")).toBe(false);
  });

  it("preserves grouped small categories under Other", () => {
    const grouped = groupSmallCategories([
      category("rent", 96),
      category("coffee", 2),
      category("fees", 2),
    ]);
    const graph = buildCashflowGraph(
      cashflow({ expenseCategories: grouped, outcomes: grouped }),
      labels,
      localize,
    );

    const other = graph.nodes.find((node) => node.kind === "parent" && node.name === "Other");
    expect(other).toBeTruthy();
    if (!other) return;
    const children = graph.nodes.filter(
      (node) => node.kind === "child" && node.parentId === other.id,
    );
    expect(children.map((child) => child.name)).toEqual(["coffee", "fees"]);
    expect(children.reduce((sum, child) => sum + child.total, 0)).toBe(4);
  });

  it("keeps savings draw as an income source", () => {
    const graph = buildCashflowGraph(
      cashflow({
        income: 100,
        savingsDraw: 40,
        incomeSources: [category("salary", 100), category("savings-draw", 40)],
      }),
      labels,
      localize,
    );

    const draw = graph.nodes.find((node) => node.id === "income:savings-draw");
    expect(draw?.kind).toBe("income");
    expect(draw?.color).toBe("var(--warning)");
    expect(graph.nodes[graph.hubIndex]?.total).toBe(140);
  });
});
