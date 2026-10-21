## Why

The plan dashboard and trajectory engine now answer whether the current plan is on track, but the only comparison is a fixed conservative/base/optimistic band. The existing `scenarios` table is unused, so a user cannot save "retire earlier", "contribute R$ 500 more", or "returns stay at 4%" and compare those futures side by side. This change turns scenarios into a first-class, editable planning tool.

## What Changes

- Add saved plan scenarios with a name, default flag, and assumptions for expected return, inflation, monthly contribution, and horizon.
- Add create, edit, duplicate, delete, and set-default flows.
- Compare the base plan and saved scenarios side by side with projected net worth, monthly contribution, horizon, and real return.
- Apply the selected scenario to the long-horizon net-worth trajectory.
- Seed sensible base, optimistic, and pessimistic scenarios when none exist.
- Expose scenario CRUD and comparison through the versioned REST API.
- Validate scenario assumptions and prevent deleting the last/default base scenario without choosing a replacement.
- Out of scope: Monte Carlo, event-based cash-flow timing, per-goal scenario overrides, tax modeling, and changing goal funding inputs from inside a scenario.

## Capabilities

### New Capabilities

- `scenario-lab`: Saved scenarios, assumption editing, default selection, comparison, and scenario application.

### Modified Capabilities

- `financial-planner`: Scenario support now uses saved, user-editable scenarios rather than hard-coded comparison multipliers.
- `projections`: Trajectory assumptions can be overridden by the selected scenario while remaining deterministic.

## Impact

- **Schema**: use the existing `scenarios` table; validate the `assumptions` JSONB shape. No migration expected unless defaults need a unique constraint.
- **Services**: scenario CRUD/validation, default selection, comparison, and scenario-aware trajectory.
- **UI**: Projections page gains a scenario lab; planner/dashboard link to it.
- **API**: scenario list/create/update/delete and comparison endpoints.
- **Tests**: validation, default behavior, deterministic comparison, API contract, and UI flow.
