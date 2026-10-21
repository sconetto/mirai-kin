## 1. Dashboard data contract

- [x] 1.1 Confirm the plan-status and long-horizon trajectory contracts from `add-goal-trajectory` are available; document the dependency.
- [x] 1.2 Add a dashboard view-model service that shapes net-worth history, projection bands, goal statuses, movement decomposition, contribution pace, and composition for the page.
- [x] 1.3 Add URL-backed range parsing for `1M`, `6M`, `1Y`, `All`, and `Plan`, with a documented default.
- [x] 1.4 Add tests for range boundaries, missing history, and partial plan data.

## 2. Plan status and goals

- [x] 2.1 Build the plan verdict header with overall status, next action, and links to the planner.
- [x] 2.2 Build the goal status list with status labels, projected value, target, gap, required contribution, and planner links.
- [x] 2.3 Add setup states for goals missing funding assumptions, contribution, or target date.
- [x] 2.4 Add localized labels and explanations for on-track, at-risk, off-track, and insufficient-data states.

## 3. Charts

- [x] 3.1 Build the net-worth trajectory chart with actual history, conservative/base/optimistic bands, and goal target markers.
- [x] 3.2 Build the net-worth movement waterfall with reconciling components and an explicit residual only when necessary.
- [x] 3.3 Build the contribution-pace view comparing actual contributions with the required pace.
- [x] 3.4 Build the composition view for cash, investments, property/assets, and liabilities; link category detail to Spending.
- [x] 3.5 Add accessible summaries and non-color status cues to every chart.

## 4. Overview composition

- [x] 4.1 Replace the current overview hierarchy with plan status, trajectory, goals, movement, contribution pace, and composition in that order.
- [x] 4.2 Move category-spike, budget-variance, and monthly savings-rate alerts off the overview and into the spending surface.
- [x] 4.3 Add empty, insufficient-data, and history-building states for every dashboard region.
- [x] 4.4 Add responsive layouts for desktop, tablet, and mobile, using compact representations below the desktop breakpoint.

## 5. Verification

- [x] 5.1 Add Playwright coverage for plan-first ordering, range switching, goal status rendering, and insufficient-data behavior.
- [x] 5.2 Verify the overview renders correctly in pt-BR and en, light and dark themes.
- [x] 5.3 Run `pnpm typecheck`, `pnpm lint`, the unit suite, and the Playwright suite.
- [x] 5.4 Run `openspec validate add-plan-dashboard --strict`.
