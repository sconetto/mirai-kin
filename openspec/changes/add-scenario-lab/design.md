## Context

`scenarios` already exists in the schema with `name`, `assumptions` JSONB, and `isDefault`, but nothing reads or writes it. Projections use fixed ±10% income/expense multipliers, and `planTrajectory` derives a single weighted return from goal assumptions. This change makes saved scenarios the source of plan-level what-if comparisons.

## Goals / Non-Goals

**Goals:**

- Edit and persist scenario assumptions.
- Compare base and saved scenarios deterministically.
- Apply one default scenario to the long-horizon trajectory.
- Keep the model simple enough for a single-user homelab planner.

**Non-Goals:**

- Monte Carlo or probabilistic outcomes.
- Event-timed cash flows, tax effects, or per-goal scenario overrides.
- A general spreadsheet-like modeling engine.
- changing goal funding from inside a scenario.

## Decisions

### 1. Assumption shape

Use a validated JSONB shape:

```
{
  expectedReturn: number,      // annual nominal fraction, e.g. 0.07
  inflation: number,           // annual fraction, e.g. 0.03
  monthlyContribution: number, // base-currency amount
  horizonMonths: number        // 12–600
}
```

Missing keys inherit from the base plan. The base plan derives its return from funded goals and its contribution from the sum of goal contributions. This preserves the current behavior while allowing one-field overrides.

### 2. Scenarios are plan-level, not goal-level

Goals keep their own expected return and inflation. A scenario overrides the **plan-level** trajectory assumptions. This keeps the comparison understandable and avoids multiplying every scenario by every goal.

### 3. Seed base/optimistic/pessimistic scenarios

When no scenarios exist, create:

- `Base` — inherits the current plan assumptions
- `Optimistic` — base return +2 percentage points
- `Pessimistic` — base return −2 percentage points

The base scenario is the default.

### 4. Default selection is transactional

`isDefault` is application-managed. Setting a default clears the flag on all other scenarios in the same transaction. Deleting the default requires choosing another scenario; deleting the last scenario is rejected.

**Why not a database partial unique index?** A transaction is enough for a single-user app and avoids a migration solely for this singleton invariant.

### 5. Comparison is deterministic

`comparePlanScenarios` calls the same trajectory math for each scenario with explicit assumptions. It returns a stable ordered set: default base first, then by name. No randomness and no hidden current-time dependency beyond the supplied `asOf`.

### 6. Scenario-aware trajectory

Refactor `planTrajectory` to accept optional assumption overrides. If none are provided, it uses the current plan-derived defaults. This makes the dashboard and API able to request a scenario without duplicating math.

### 7. API and UI

- API: `GET/POST /api/v1/scenarios`, `PATCH/DELETE /api/v1/scenarios/{id}`, and `GET /api/v1/scenarios/compare`.
- UI: Projections page gets a scenario list and editor. The trajectory chart can overlay the selected comparison.
- Validation errors are localized in the UI.

## Risks / Trade-offs

- **Scenario drift from goal assumptions** → display inherited assumptions explicitly.
- **Too many scenarios** → cap at a documented count (for example 20) and put the list in a scrollable panel.
- **Comparison overload** → show at most the base plus three selected scenarios on the chart; table can list all.
- **Deleting defaults** → require a replacement and validate in one transaction.
- **JSONB validation** → parse through Zod on every write and on read for legacy rows.

## Migration Plan

1. Add scenario schemas and service functions.
2. Seed scenarios when empty.
3. Refactor `planTrajectory` to accept overrides.
4. Add API routes and OpenAPI.
5. Add projections UI.
6. Rollback: scenarios are additive; the existing fixed comparison remains until the UI switch is complete.

## Open Questions

- Should scenarios allow an absolute monthly contribution override or a delta? Use an absolute base-currency amount for predictability.
- Should the dashboard display the selected scenario name? Yes, show the default scenario label near the assumptions.
- Should scenario comparison include goal status? The first version compares net-worth trajectories only; goal status remains driven by the base plan.
