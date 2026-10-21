## Context

mirai-kin is a single-user, homelab-hosted financial planner. Its primary question is whether the user is on track for long-term goals, not whether this month's category spending looks normal. Today the schema has goals, scenarios, snapshots, investment positions, and a cash-flow forecast, but they are not connected:

- Goals store a target and optional date, but the UI does not assign accounts or contributions.
- Planner progress is `current balance / target`; for UI-created goals `accountIds` is empty.
- `forecast()` uses recurring transactions and debt schedules for a 12-month cash-flow view. It has no starting net worth, returns, inflation, or goal contributions.
- The `scenarios` table exists, but projections use fixed ±10% multipliers.
- Net worth is assembled differently by `analytics.overview()` and `equity.getEquity()`.

This change creates the plan model and trajectory engine. The dashboard consumes it in a separate change.

## Goals / Non-Goals

**Goals:**

- Make goal funding explicit and editable: linked account shares or a manual funded amount, plus a planned monthly contribution.
- Compute a deterministic, inflation-aware trajectory in the base currency.
- Produce a per-goal status, funding gap, required monthly contribution, and conservative/base/optimistic range.
- Establish one canonical net-worth calculation for planner, equity, API, and future dashboard use.
- Expose a stable read-only plan-status contract for the UI, API, and optional agents.
- Add deterministic goal-risk insights without requiring an LLM.

**Non-Goals:**

- Dashboard layout or chart work; that is `add-plan-dashboard`.
- Monte Carlo or stochastic modeling.
- Full scenario CRUD UI; `add-scenario-lab` can build on the assumptions introduced here.
- Multi-user sharing, document storage, or public-internet security.
- Guaranteed forecast accuracy; the product explains assumptions and uncertainty rather than pretending to predict markets.

## Decisions

### 1. Goals gain a funding mode and contribution assumptions

Extend `goals` with:

- `fundingMode`: `accounts` or `manual`
- `manualCurrentAmount`: money, used when `fundingMode = manual`
- `monthlyContribution`: money, default `0`
- `expectedReturn`: rate, default `0` (nominal annual return, stored as a decimal fraction)
- `inflationRate`: rate, nullable; falls back to the application's configured inflation assumption
- `targetDate` and `targetAmount` remain, but both are required to produce an on-track verdict
- `priority` remains the funding order

Add `goal_allocations`:

```
goal_allocations
  id
  goal_id
  account_id
  share_pct
  unique(goal_id, account_id)
```

An allocation lets multiple goals share an account without double-counting. Legacy `goals.account_ids` remains for compatibility: if a goal has no explicit allocations, each listed account contributes 100%.

**Why not JSONB allocations?** A table gives foreign keys, per-goal uniqueness, and straightforward validation that a goal does not exceed 100% of an account. A JSONB array would be simpler to migrate but harder to query and validate.

**Manual mode** avoids forcing the user to mirror real bank accounts just to model goals. It is also the escape hatch for assets without transaction-level tracking.

### 2. Trajectory math is deterministic and real-terms aware

All calculations happen in the base currency:

1. Convert the target and current amount to base currency using the active rate on the as-of date.
2. Derive the real annual return: `(1 + nominalReturn) / (1 + inflation) - 1`.
3. Convert to a monthly rate: `(1 + realAnnualReturn)^(1/12) - 1`.
4. Project with future value of a present amount plus an ordinary annuity:

```
months = full months from asOf to targetDate
growth = (1 + monthlyRate)^months
projected = current * growth
          + monthlyContribution * ((growth - 1) / monthlyRate)
```

When the monthly rate is zero, the contribution term is `monthlyContribution * months`.

5. Required contribution solves the same equation for the contribution:

```
gap = target - current * growth
required = gap > 0 ? gap * monthlyRate / (growth - 1) : 0
```

If the target date is now or in the past, required contribution is `0` when funded and the goal is evaluated against today's amount.

**Why real terms?** A nominal projection that ignores inflation makes long-term goals look healthier than they are. A real-terms projection also makes the target amount comparable over time.

### 3. Status uses a conservative/base/optimistic range

The engine computes three return paths:

- `conservative`: expected return minus 2 percentage points
- `base`: expected return
- `optimistic`: expected return plus 2 percentage points

Status rules:

- `insufficient_data`: no target date, no target amount, or no usable funding amount/assumptions
- `on_track`: the conservative projection meets or exceeds the target
- `at_risk`: the conservative projection misses, but the base projection meets the target
- `off_track`: the base projection misses the target

**Why not a single number?** A plan that only works under optimistic returns should not be labeled on track. The range makes the assumption visible without requiring stochastic modeling. The ±2 percentage-point band is a documented default; `add-scenario-lab` can make it user-editable.

### 4. One canonical net-worth service

Create `getNetWorth(asOf)` as the single domain calculation. It wraps the existing equity composition but fixes the investment policy:

- For an investment account with positions, use the positions' market value and do not add the account's transaction-derived balance.
- For an investment account without positions, use the account balance as the fallback.
- Non-investment accounts use opening balance plus transaction total.
- Manual estate assets are included once.
- Liabilities are included as positive magnitudes.

`analytics.overview()`, the equity page, the planner, snapshots, and the plan-status API all consume this service. Historical snapshots remain immutable, as specified by the existing equity capability.

**Why now?** Goal funding cannot be trusted if the dashboard and equity page disagree about net worth. Today they happen to match because there are no investment positions; once positions exist, the divergence becomes visible.

### 5. Plan status is a read model, not a page calculation

Add a domain service that returns:

```
{
  asOf, baseCurrency,
  netWorth: { assets, liabilities, net },
  assumptions: { baseReturn, inflation },
  goals: [{
    id, name, type, priority,
    status,
    current, target, progress,
    projected: { conservative, base, optimistic },
    gap, requiredMonthly,
    currency,
    confidence
  }]
}
```

Expose it as `GET /api/v1/plan-status` and consume it from the planner UI. The dashboard and an optional read-only agent can use the same contract later. This avoids each surface reimplementing goal math.

### 6. Goal-risk insights extend the existing deterministic insight system

Add two insight types:

- `goal_at_risk`: conservative projection misses, base meets
- `goal_off_track`: base projection misses

Each carries structured data (goal id/name, gap, required monthly, target date) and a stable signature. No new LLM dependency is introduced.

### 7. Existing goals degrade honestly

Existing goals without allocations, contributions, or a target date are not silently treated as on track. They return `insufficient_data` with a reason and a link to complete the funding model. No data migration is required beyond adding nullable/defaulted columns.

## Risks / Trade-offs

- **False precision** → show assumptions, use rounded display values, and always show a range. Do not present a single future number as a prediction.
- **Shared-account double counting** → enforce per-account allocation totals ≤100% and validate on write; show a warning for legacy `accountIds` overlap.
- **Investment valuation gaps** → use the documented account fallback when positions are absent; surface a data-quality prompt to add holdings/valuations.
- **FX drift** → calculate in base currency at the as-of date and label the conversion; historical snapshots stay immutable.
- **Changing assumptions silently changes status** → persist assumptions with the goal and show them in the UI/API response.
- **Scope creep into scenario editing** → keep this change to default conservative/base/optimistic bands; full scenario CRUD belongs to `add-scenario-lab`.
- **Performance** → trajectory math is cheap; the expensive part is aggregating accounts/positions. Reuse the canonical net-worth service and avoid per-goal full-table scans.

## Migration Plan

1. Add nullable/defaulted columns and the `goal_allocations` table in a Drizzle migration.
2. Add service-level calculation and plan-status API.
3. Backfill no data; existing goals remain valid but may report `insufficient_data`.
4. Update the planner UI to edit funding inputs and display status.
5. Update insights and OpenAPI.
6. Rollback: drop `goal_allocations` and the new goal columns. No historical data is rewritten.

## Open Questions

- Should the emergency-fund goal ignore expected return by default? The design assumes a 0% return default for that type, but the user can override it.
- Should contributions be treated as fixed nominal amounts or inflation-adjusted? This change assumes fixed nominal contributions; scenario support can add growth later.
- Should the app suggest a feasible target date when the required contribution exceeds current capacity? This is a useful follow-up, not part of this change.
