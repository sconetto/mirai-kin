## Why

The overview cash-flow graph currently jumps from the central hub straight to top-level expense categories. That hides the category hierarchy already available in the dashboard data, so users cannot see how a parent group (for example, Food & Drinks) splits into its specific child categories (Groceries, Restaurants, and so on) without leaving the graph.

## What Changes

- Add a parent-to-child stage to the expense side of the overview cash-flow Sankey.
- Keep parent nodes as the first expense column after the central hub, showing the aggregated parent total.
- Add child nodes after each parent, showing the specific category amounts that make up the parent total.
- Preserve leaf behavior for parents without child detail, and keep surplus/savings draw as outcomes.
- Keep the existing 3% small-category grouping and Wallet group-parent behavior.
- Ensure flows reconcile when a parent has direct spending in addition to child categories.
- Update tooltips and the accessible summary to reflect the added hierarchy.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `plan-dashboard`: the cash-flow requirement gains explicit parent and child category stages in the overview Sankey, including reconciliation and fallback behavior.

## Impact

- `src/services/dashboard-charts.ts`: extend cash-flow graph data with parent/child flow structure and residual handling.
- `src/components/charts/cashflow-sankey.tsx`: render the extra stage, labels, links, tooltips, and accessible summary.
- `src/app/[locale]/(app)/page.tsx`: pass any additional graph metadata if needed.
- Tests: dashboard data-contract and chart behavior coverage for parent/child flows, residual spending, and leaf categories.
