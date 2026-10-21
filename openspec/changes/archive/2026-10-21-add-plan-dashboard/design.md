## Context

The current overview is a tactical dashboard: insight banners, four KPIs, a spending-category donut, an account list, and recent transactions. It is useful for tracking, but it does not answer the product's primary question. The planner currently exposes goal progress as a percentage; `add-goal-trajectory` adds funding assumptions, projections, status, and a plan-status read model.

This change redesigns the home surface as a **plan dashboard**. It borrows Sure's visual grammar — flow, trajectory, comparison, composition, a time-range control — but inverts the information hierarchy around long-term goals instead of monthly spending.

## Goals / Non-Goals

**Goals:**

- Make plan status the first thing the user sees.
- Show trajectory relative to the plan, with uncertainty visible.
- Explain what changed since the last checkpoint.
- Show goal gaps and required contributions without requiring a separate page.
- Keep monthly cash-flow detail available as supporting context.
- Work well on a homelab desktop, tablet, and phone.
- Degrade honestly when history or plan assumptions are incomplete.

**Non-Goals:**

- Goal funding/trajectory math; delivered by `add-goal-trajectory`.
- Editable scenarios; delivered by `add-scenario-lab`.
- A persistent AI sidebar or external agent surface.
- New financial data sources, bank sync, or document storage.
- Native mobile or desktop clients.

## Decisions

### 1. Plan-first hierarchy

The dashboard is ordered as:

1. Overall plan status and next action
2. Net-worth trajectory versus plan
3. Goal status list
4. What changed since the last checkpoint
5. Contribution pace
6. Composition
7. Supporting monthly cash-flow detail

The current insight banners move below the plan layer or into Spending. Category spikes and budget alerts remain available, but they do not lead the home screen.

**Why:** The home screen should answer one question before offering diagnostics. A wall of alerts makes the product feel like a monitoring tool, not a planning tool.

### 2. Trajectory is the hero chart

Use a line/area composition:

- solid line: actual net-worth history
- dashed line: base projection
- shaded band: conservative to optimistic projection
- markers: goal target dates
- a compact summary: “On track / R$ 440 short / required contribution”

The x-axis includes both history and projection. The `Plan` range shows the full horizon; `1M/6M/1Y/All` show history and the forward portion that fits the range.

**Why not a gauge or score?** A score hides assumptions. The trajectory shows the path and the range, which is the actual decision input. Status is a label on top, not a substitute for the chart.

### 3. Use a movement waterfall rather than a cash-flow Sankey as the primary explanation

The second chart decomposes net-worth change since the previous checkpoint:

```
Opening net worth
  + contributions
  + market movement
  - spending
  - debt payments
  ± FX
  = closing net worth
```

A waterfall is exact, easier to audit, and answers “why did my plan move?” better than a Sankey. A Sankey can be added later as a monthly “where the money went” detail; it is not required for the plan question.

**Why:** Sure’s Sankey is visually strong but optimized for monthly cash flow. Our primary job is longitudinal, and the bridge makes the arithmetic visible.

### 4. Goal status is a list, not a chart

Each goal gets a row or compact card:

- name and target date
- status pill with text, not color alone
- projected value and target
- gap
- required monthly contribution
- link to the planner

No progress ring wall. The status and gap are more informative than a percentage.

### 5. Contribution pace replaces spending comparison

The third visual compares actual contributions with the pace required by the plan:

- cumulative actual contributions for the selected period
- required pace line
- monthly contribution variance

**Why:** Sure’s spending comparison answers “am I spending more than last month?” Our product needs “am I feeding the plan fast enough?”

### 6. Composition replaces the spending donut

The overview composition chart shows assets, liabilities, and goal funding:

- cash / investments / property / other
- liabilities
- optionally, funding by goal

Spending categories move to Spending. This makes the overview about the balance sheet and the plan, not monthly consumption.

### 7. Time ranges are URL-backed

Ranges: `1M`, `6M`, `1Y`, `All`, `Plan`.

Use a search parameter (for example `?range=1y`) so the view is shareable and server-rendered. Changing the range re-renders the server component; no client-side data fetching is required.

### 8. Server-rendered data, minimal client state

The dashboard remains a server component. It composes:

- plan status
- net-worth history and projection
- movement decomposition
- contribution pace
- composition

Chart components receive already-shaped data. Client code is limited to chart rendering and the range links; no financial aggregation happens in the browser.

**Why:** It keeps math in one domain layer, avoids duplicate calculations, and supports future API/agent consumers.

### 9. Honest partial states

The dashboard must distinguish:

- no goals yet → invite the user to create a plan
- goals without funding assumptions → show “needs setup” and a link
- no snapshots yet → show current net worth and a “history builds from here” state
- insufficient market/contribution history → hide the decomposition and explain why

It must never show a positive “on track” status without the required inputs.

### 10. Responsive chart density

- Desktop: two-column grid, trajectory and goal list side by side; bridge and contribution pace below.
- Tablet: one column, charts keep full width; goal list becomes cards.
- Mobile: plan status first, trajectory as a compact sparkline, goal cards, contribution pace; dense flow charts are replaced by summary rows.

Charts are accompanied by accessible summaries and do not rely on color alone.

## Risks / Trade-offs

- **Chart overload** → cap the first screen at one hero chart and one status list; move detail behind links.
- **False precision** → show assumptions and a range; round display values; label insufficient data.
- **Snapshot gaps** → fall back to current net worth and explain that history is still building.
- **Movement decomposition ambiguity** → define contributions, market movement, spending, debt, and FX categories explicitly; show an “other” residual only when necessary.
- **Performance** → aggregate on the server, limit series points by range, and reuse plan-status/net-worth services.
- **Mobile complexity** → use compact representations rather than shrinking desktop charts.
- **Dependency on `add-goal-trajectory`** → implement that change first; the dashboard can ship behind a route or empty state until the plan contract is available.

## Migration Plan

No schema migration. Replace the overview composition incrementally:

1. Add plan-status/trajectory data reads.
2. Add the new dashboard components and range switch.
3. Swap the overview hierarchy.
4. Keep the old tactical insights available on Spending.
5. Rollback by restoring the previous overview composition; no data is rewritten.

## Open Questions

- Should the dashboard show one overall plan verdict or only per-goal verdicts? The design assumes an overall summary derived from the highest-priority goal plus a per-goal list.
- Should the movement waterfall include investment contributions as “contributions” or “transfers”? It should treat them as contributions to the plan while excluding them from spending.
- Should a compact cash-flow Sankey be included in the first version, or deferred until the plan dashboard is validated? The design treats it as optional detail.
