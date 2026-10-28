import type { MonthlyCashflow, MonthlyCategory } from "@/services/dashboard-charts";

export type CashflowGraphNodeKind = "income" | "hub" | "parent" | "outcome" | "child";

export type CashflowGraphNode = {
  id: string;
  name: string;
  total: number;
  depth: number;
  kind: CashflowGraphNodeKind;
  color: string;
  parentId?: string;
};

export type CashflowGraphLinkKind = "income" | "expense" | "child";

export type CashflowGraphLink = {
  source: number;
  target: number;
  value: number;
  kind: CashflowGraphLinkKind;
};

export type CashflowGraph = {
  nodes: CashflowGraphNode[];
  links: CashflowGraphLink[];
  hubIndex: number;
};

export type CashflowGraphLabels = {
  hub: string;
  direct: string;
};

const DIRECT_RESIDUAL_THRESHOLD = 0.01;

function round4(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

function parentColor(category: MonthlyCategory): string {
  return category.id === "surplus" ? "var(--positive)" : "var(--negative)";
}

/**
 * Converts the dashboard's parent/child spending tree into the indexed node and
 * link shape required by the Sankey. The graph has four stages:
 * income sources -> hub -> expense parents/surplus -> expense children.
 */
export function buildCashflowGraph(
  cashflow: MonthlyCashflow,
  labels: CashflowGraphLabels,
  localize: (category: MonthlyCategory) => string,
): CashflowGraph {
  const nodes: CashflowGraphNode[] = [];
  const links: CashflowGraphLink[] = [];

  for (const source of cashflow.incomeSources) {
    nodes.push({
      id: `income:${source.id}`,
      name: localize(source),
      total: source.total,
      depth: 0,
      kind: "income",
      color: source.id === "savings-draw" ? "var(--warning)" : "var(--positive)",
    });
  }

  const hubIndex = nodes.length;
  nodes.push({
    id: "hub",
    name: labels.hub,
    total: cashflow.income + cashflow.savingsDraw,
    depth: 1,
    kind: "hub",
    color: "var(--color-accent)",
  });

  for (const [index, source] of cashflow.incomeSources.entries()) {
    links.push({ source: index, target: hubIndex, value: source.total, kind: "income" });
  }

  const outcomeIndexes: number[] = [];
  for (const outcome of cashflow.outcomes) {
    const index = nodes.length;
    outcomeIndexes.push(index);
    nodes.push({
      id: `outcome:${outcome.id}`,
      name: localize(outcome),
      total: outcome.total,
      depth: 2,
      kind: outcome.id === "surplus" ? "outcome" : "parent",
      color: parentColor(outcome),
    });
    links.push({ source: hubIndex, target: index, value: outcome.total, kind: "expense" });
  }

  for (const [outcomePosition, outcome] of cashflow.outcomes.entries()) {
    if (outcome.children.length === 0) continue;

    const parentIndex = outcomeIndexes[outcomePosition];
    const parentId = nodes[parentIndex]?.id;
    if (!parentId) continue;

    const children = [...outcome.children].sort((a, b) => b.total - a.total);
    const childTotal = round4(children.reduce((sum, child) => sum + child.total, 0));

    for (const child of children) {
      const childIndex = nodes.length;
      nodes.push({
        id: `${parentId}:child:${child.id}`,
        name: localize(child),
        total: child.total,
        depth: 3,
        kind: "child",
        color: nodes[parentIndex]?.color ?? "var(--negative)",
        parentId,
      });
      links.push({
        source: parentIndex,
        target: childIndex,
        value: child.total,
        kind: "child",
      });
    }

    const residual = round4(outcome.total - childTotal);
    if (residual > DIRECT_RESIDUAL_THRESHOLD) {
      const childIndex = nodes.length;
      nodes.push({
        id: `${parentId}:direct`,
        name: labels.direct,
        total: residual,
        depth: 3,
        kind: "child",
        color: nodes[parentIndex]?.color ?? "var(--negative)",
        parentId,
      });
      links.push({
        source: parentIndex,
        target: childIndex,
        value: residual,
        kind: "child",
      });
    }
  }

  return { nodes, links, hubIndex };
}
