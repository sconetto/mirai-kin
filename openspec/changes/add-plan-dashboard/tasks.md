## 1. Dashboard data contract

- [ ] 1.1 Confirm the plan-status and long-horizon trajectory contracts from `add-goal-trajectory` are available; document the dependency.
- [ ] 1.2 Add a dashboard view-model service that shapes net-worth history, projection bands, goal statuses, movement decomposition, contribution pace, and composition for the page.
- [ ] 1.3 Add URL-backed range parsing for `1M`, `6M`, `1Y`, `All`, and `Plan`, with a documented default.
- [ ] 1.4 Add tests for range boundaries, missing history, and partial plan data.

## 2. Plan status and goals

- [ ] 2.1 Build the plan verdict header with overall status, next action, and links to the planner.
- [ ] 2.2 Build the goal status list with status labels, projected value, target, gap, required contribution, and planner links.
- [ ] 2.3 Add setup states for goals missing funding assumptions, contribution, or target date.
- [ ] 2.4 Add localized labels and explanations for on-track, at-risk, off-track, and insufficient-data states.

## 3. Charts

- [ ] 3.1 Build the net-worth trajectory chart with actual history, conservative/base/optimistic bands, and goal target markers.
- [ ] 3.2 Build the net-worth movement waterfall with reconciling components and an explicit residual only when necessary.
- [ ] 3.3 Build the contribution-pace view comparing actual contributions with the required pace.
- [ ] 3.4 Build the composition view for cash, investments, property/assets, and liabilities; link category detail to Spending.
- [ ] 3.5 Add accessible summaries and non-color status cues to every chart.

## 4. Overview composition

- [ ] 4.1 Replace the current overview hierarchy with plan status, trajectory, goals, movement, contribution pace, and composition in that order.
- [ ] 4.2 Move category-spike, budget-variance, and monthly savings-rate alerts off the overview and into the spending surface.
- [ ] 4.3 Add empty, insufficient-data, and history-building states for every dashboard region.
- [ ] 4.4 Add responsive layouts for desktop, tablet, and mobile, using compact representations below the desktop breakpoint.

## 5. Verification

- [ ] 5.1 Add Playwright coverage for plan-first ordering, range switching, goal status rendering, and insufficient-data behavior.
- [ ] 5.2 Verify the overview renders correctly in pt-BR and en, light and dark themes.
- [ ] 5.3 Run `pnpm typecheck`, `pnpm lint`, the unit suite, and the Playwright suite.
- [ ] 5.4 Run `openspec validate add-plan-dashboard --strict`.
