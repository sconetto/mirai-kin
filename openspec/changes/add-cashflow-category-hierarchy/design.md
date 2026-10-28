## Context

The overview cash-flow card uses a Recharts Sankey with three columns: income sources, a central hub, and expense outcomes. The dashboard service already builds `expenseCategories` as a parent/child tree: top-level categories have a `total` and a `children` array for Wallet subcategories and grouped small categories. The chart currently renders only the parent totals, so the hierarchy is invisible in the graph.

The existing `plan-dashboard` spec already requires subcategory detail and Wallet group-parent behavior. This change moves that detail into the Sankey itself while preserving the existing outflows list and spending comparison.

## Goals / Non-Goals

**Goals:**

- Add a parent-category column and a child-category column to the expense side of the Sankey.
- Show parent totals and child-specific amounts in the same graph.
- Keep flows reconciled when a parent has direct spending plus child spending.
- Preserve leaf parents, surplus, savings draw, 3% grouping, and Wallet group parents.
- Keep the chart readable on narrow screens and accessible to assistive technology.

**Non-Goals:**

- Changing the dashboard data queries or category taxonomy.
- Replacing the outflows donut/list or spending comparison.
- Adding arbitrary drill-down interactions or new routes.
- Changing report charts outside the overview cash-flow card.

## Decisions

### 1. Build the graph in a pure helper, not inside the component

Add a `buildCashflowGraph(cashflow, labels)` helper that converts `MonthlyCashflow` into indexed nodes and links. The component becomes a renderer for that graph. This keeps layout data testable and avoids duplicating hierarchy logic in JSX.

Alternative considered: derive nodes/links directly in `cashflow-sankey.tsx`. Rejected because reconciliation and residual handling are easier to test as pure data.

### 2. Four-stage graph

The graph uses these stages:

1. Income sources (depth 0), including savings draw.
2. Central hub (depth 1).
3. Expense parents and surplus (depth 2).
4. Expense children (depth 3).

Parents with children get outgoing links to each child. Parents without children remain leaves at depth 2. Surplus remains a depth-2 leaf so it does not imply a category breakdown.

### 3. Reconcile parent totals with a direct-spending child

A parent's total may exceed the sum of its children when transactions are assigned directly to the parent category. In that case, add a synthetic child node for the residual, labeled as direct spending for that parent. If the residual is below a small rounding threshold, omit it. This guarantees that incoming parent flow equals outgoing child flow.

### 4. Label placement by stage

- Income sources: labels to the left.
- Hub: compact label above or left of the hub.
- Parents: labels to the left of the parent node, between the hub and the parent column.
- Children: labels to the right of the child node.

Increase the right margin to accommodate child labels, and truncate long labels consistently with the current chart.

### 5. Preserve existing grouping and outcomes

`groupSmallCategories` already creates an `Other` parent with children. The graph treats that like any other parent. `capCategories` continues to limit top-level outcomes; grouped children remain visible under `Other`. Surplus and savings draw keep their current semantic colors and positions.

### 6. Tooltips and accessible summary

Node tooltips show the localized label and amount. Link tooltips show the source and target labels plus the amount. The screen-reader summary includes income, spending, the largest parent groups, and the child categories for those groups.

## Risks / Trade-offs

- **Label crowding on small screens** → Keep the existing truncation, reduce node padding when needed, and allow the card to scroll horizontally on narrow viewports if labels still collide.
- **Very deep or wide category trees** → The graph only renders one child level, matching the current data model; deeper nesting is out of scope.
- **Residual child nodes look synthetic** → Label them explicitly as direct spending and only add them when material.
- **Sankey layout changes can make links cross** → Sort parents and children by total descending and keep deterministic ordering.

## Migration Plan

No schema or data migration. The change is UI/data-shape only and can be rolled back with the chart helper and component changes.

## Open Questions

- Should the child column be hidden behind a toggle on narrow screens, or always rendered with horizontal scrolling? Default: always render, with responsive margins and truncation.
- Should parent labels use the localized group name or the raw category name when they differ? Default: use the existing localized category display.
