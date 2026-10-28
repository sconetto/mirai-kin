## 1. Graph data model

- [x] 1.1 Add a pure `buildCashflowGraph` helper that converts `MonthlyCashflow` into indexed parent/child nodes and links.
- [x] 1.2 Add direct-spending residual child nodes so parent inflows equal child outflows when a parent has direct spending.
- [x] 1.3 Preserve leaf parents, surplus/savings-draw outcomes, 3% grouping, and Wallet group parents.
- [x] 1.4 Add unit tests for parent/child reconciliation, residual handling, leaf categories, and grouped small categories.

## 2. Chart rendering

- [x] 2.1 Render the four-stage Sankey: income sources → hub → expense parents/surplus → expense children.
- [x] 2.2 Place parent labels between the hub and parent column, and child labels to the right of child nodes.
- [x] 2.3 Update node/link tooltips to show localized source, parent, and child labels with amounts.
- [x] 2.4 Extend the accessible summary with the largest parent groups and their child breakdowns.
- [x] 2.5 Adjust margins, truncation, and responsive behavior so the extra column remains readable.

## 3. Verification

- [x] 3.1 Add or update dashboard data-contract coverage for the parent/child graph shape.
- [x] 3.2 Run `pnpm typecheck`, `pnpm lint`, and `pnpm test`.
- [x] 3.3 Visually verify the overview cash-flow card on a month with parent and child spending, including leaf parents and surplus.
- [x] 3.4 Run `pnpm test:e2e` and clean up any test-created data.
