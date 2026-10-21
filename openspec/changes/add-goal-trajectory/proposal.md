## Why

mirai-kin's primary question is "am I on track for my long-term goals?", but the current planner cannot answer it: goals are not funded from accounts or contributions, progress is a static balance divided by a target, and the projection engine only looks 12 months ahead at recurring cash flow. Required contribution, return, inflation, and scenario assumptions are either missing or unused. This change builds the plan model and trajectory engine that the dashboard and future agent surfaces will consume.

## What Changes

- Add goal funding inputs: linked account allocations, manual funded amount, planned monthly contribution, expected nominal return, inflation, target date, priority, and funding mode.
- Add a deterministic trajectory calculation in the base currency: projected value at the target date, funding gap, required monthly contribution, and per-goal status (`on track`, `at risk`, `off track`, or `insufficient data`).
- Add confidence bands from conservative, base, and optimistic return assumptions instead of a single point estimate.
- Make goal progress reflect the selected funding model, with multi-currency balances converted to the base currency.
- Establish one canonical net-worth service that includes investment positions and manual assets without double-counting, and use it from the planner, equity, and dashboard surfaces.
- Use explicit per-goal return, inflation, and contribution assumptions with conservative/base/optimistic bands; full editable scenario management remains a follow-up change.
- Add a read-only plan-status API contract returning goals, trajectories, assumptions, status, and gaps.
- Add deterministic goal-risk insights (`goal_at_risk`, `goal_off_track`) to the existing insight system.
- Out of scope: the dashboard redesign (the `add-plan-dashboard` change), stochastic/Monte Carlo modeling, and document storage.

## Capabilities

### New Capabilities

- `goal-trajectory`: Goal funding modes, trajectory math, required contribution, status, confidence bands, and plan-status API contract.

### Modified Capabilities

- `financial-planner`: Goals persist funding allocations and contribution assumptions; required contribution and scenario behavior become executable requirements.
- `projections`: Projections gain a long-horizon net-worth trajectory with returns, inflation, and planned contributions, while retaining the existing cash-flow forecast.
- `equity`: Net worth is computed by one canonical service that handles investment accounts and positions consistently and supports goal funding.
- `insights`: Add deterministic goal-risk insights with stable signatures and localized structured data.

## Impact

- **Schema**: extend `goals` with funding/contribution/assumption fields; add a goal allocation model for shared accounts; retain existing `accountIds` compatibility. Extend `scenarios` usage.
- **Services**: planner/trajectory math, net-worth consolidation, projections, insights, and a plan-status read model.
- **API**: add a read-only plan-status endpoint and expose trajectory fields on goal responses; update OpenAPI.
- **UI**: planner goal editor and goal status/progress display; no dashboard redesign in this change.
- **Tests**: deterministic math fixtures (on-track, at-risk, off-track, insufficient data, inflation, multi-currency), net-worth consistency, API contract, and insight signatures.
