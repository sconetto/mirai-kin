## Why

The current overview answers "what happened this month?" through alert banners, four KPI cards, a spending donut, and a recent-account list. That is a tracking dashboard, not a plan dashboard. For a single-user homelab product whose primary job is "am I on track for my long-term goals?", the home screen should make plan status, trajectory, and the next decision visible before monthly spending detail.

## What Changes

- Replace the overview hierarchy with a plan-first dashboard: overall plan status, goal status, net-worth trajectory versus plan, what changed since the last checkpoint, and supporting cash-flow/composition detail.
- Add a time-range control (`1M`, `6M`, `1Y`, `All`, `Plan`) shared by the trajectory and movement views.
- Add a net-worth trajectory chart with conservative/base/optimistic bands and goal target markers.
- Add a net-worth movement/bridge view showing contributions, market movement, spending, debt payments, and FX effects since the previous checkpoint.
- Add a goal-status list with projected value, gap, required contribution, and on-track/at-risk/off-track state.
- Add a contribution-pace view comparing actual contributions with the pace required by the plan.
- Adapt the composition donut to assets/goals rather than monthly spending categories.
- Move category-spike and monthly spending insights to the spending surface; keep only plan-relevant explanations on the overview.
- Add explicit empty, insufficient-data, and partial-data states so the dashboard never implies confidence it does not have.
- Out of scope: goal trajectory math (delivered by `add-goal-trajectory`), scenario editing (`add-scenario-lab`), the assistant rail, and mobile-native clients.

## Capabilities

### New Capabilities

- `plan-dashboard`: Plan-first overview hierarchy, trajectory and movement charts, time ranges, goal status, contribution pace, composition, and insufficient-data behavior.

### Modified Capabilities

None. The dashboard consumes the new plan-status contract; it does not change goal, projection, or equity requirements.

## Impact

- **UI**: overview page and dashboard chart components; planner status links; responsive layouts for desktop, tablet, and mobile.
- **Data**: read-only consumption of the plan-status API/service, net-worth series, and transaction aggregates; no schema changes.
- **API**: no new mutation; optionally reuse `GET /api/v1/plan-status` for server-rendered dashboard data.
- **i18n**: new dashboard labels, status explanations, empty states, and date/range formatting in en and pt-BR.
- **Tests**: component tests for chart data transforms; Playwright coverage for dashboard hierarchy, range switching, goal status, and insufficient-data states.
- **Dependency**: requires the plan-status and goal-trajectory foundation from `add-goal-trajectory`.
