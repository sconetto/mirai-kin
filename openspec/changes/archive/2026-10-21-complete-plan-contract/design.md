## Context

The dashboard and trajectory features ship, but their specs claim more than the implementation delivers. The gaps are real but bounded:

- `DashboardMovement` currently exposes `income`, `expenses`, and a single `marketOther` residual.
- `DashboardPace` uses net savings as the contribution proxy.
- `PlanStatus` does not return the FX rate date, and `planTrajectory` does not return its horizon.
- The net-worth trajectory intentionally does not subtract debt principal, but the spec does not state that decision.

This change closes the contract gaps without reopening the broader scenario work.

## Goals / Non-Goals

**Goals:**

- Make the movement bridge reconcile while naming market, FX, and debt service separately where data allows.
- Track contributions from transfers into goal-funded accounts.
- Keep a documented fallback when tracked contributions do not exist.
- Return the FX rate date and trajectory horizon.
- Document the debt treatment explicitly.

**Non-Goals:**

- Editable scenarios or a scenario comparison UI.
- Per-goal manual contribution entry or contribution schedules.
- Monte Carlo modeling.
- Recomputing historical snapshots.

## Decisions

### 1. FX separation uses snapshot native values

Add `nativeValue` to `EquityComponent` and persist it in snapshot breakdowns. For movement between two snapshots:

- For each opening component with a non-base currency and a `nativeValue`, compute the opening base value and the closing base value at the closing rate.
- Sum `closingBase - openingBase` as the FX effect.
- Market movement is the residual after income, spending, and FX.

If either snapshot lacks native values (existing history), FX is `0` and the residual is labeled `Market & FX`, preserving reconciliation. New snapshots gain the split automatically.

**Why:** The base value alone cannot separate price movement from currency movement. Native values make the FX component derivable without a market-data provider.

### 2. Debt service is a memo, not a net-worth subtraction

Scheduled debt principal repayment moves cash to liabilities, so net worth changes only by interest and fees. Subtracting principal again would double-count it. The movement bridge therefore:

- keeps debt principal out of the net-worth equation,
- exposes scheduled `debtService` between the two snapshots as a memo row,
- labels it clearly so the user sees the cash obligation without misreading it as a net-worth loss.

**Why:** This is the mathematically correct treatment and preserves reconciliation.

### 3. Tracked contributions come from transfers into funded accounts

For each goal with allocations, a transfer counts as a tracked contribution when:

- the destination account is in the goal's allocations,
- the source account is not in the goal's allocations,
- the transfer date falls inside the selected period.

The contribution amount is the destination amount converted to the base currency. Transfers between accounts that both belong to the goal are internal reallocations and are not counted. Manual goals have no account lineage, so they cannot produce tracked contributions.

**Why transfers rather than net savings?** Transfers into an investment or savings account are the closest available signal of an intentional plan contribution. Net savings remains useful but is a different metric.

### 4. Contribution pace falls back honestly

`DashboardPace` gains `source: "tracked" | "net_savings"`.

- If tracked contributions exist in the period, use them for actual contributions.
- Otherwise, use net savings and label the fallback in the UI.
- The required pace remains the sum of required monthly goal contributions.

**Why:** A fallback keeps the dashboard useful before transfer data exists, but the user should know which measure is being shown.

### 5. Rate date and horizon are explicit contract fields

- `PlanStatus` and each goal return `rateDate`, the date used for base-currency conversion.
- `planTrajectory.assumptions` returns `horizonMonths`.

**Why:** These are already inputs; returning them makes the contract reproducible and auditable.

### 6. Snapshot schema stays JSONB

`nativeValue` is added inside the existing `breakdown` JSONB payload. No relational migration is required, and old snapshots remain valid with the fallback.

## Risks / Trade-offs

- **Historical snapshots lack native values** → fall back to a combined Market & FX residual and label it.
- **Transfer detection can miss direct deposits** → documented as tracked contributions, not total contributions; net-savings fallback covers the gap.
- **Cross-currency transfer conversion** → use the destination amount and the transfer-date rate, consistent with transfer reporting.
- **Debt memo could confuse** → keep it visually separate from the waterfall equation and label it as a memo.
- **Scope creep into contribution entry** → keep manual contribution entry out; `goal-contributions` covers tracked transfers only.

## Migration Plan

1. Add `nativeValue` to equity components and snapshot breakdowns.
2. Extend the dashboard movement and pace view models.
3. Add `rateDate` and `horizonMonths`.
4. Update the movement chart and pace labels.
5. Update tests.
6. Rollback: ignore `nativeValue`; the fallback behavior remains valid.

## Open Questions

- Should direct deposits into a goal account count as tracked contributions? This change only counts transfers; income remains part of net savings.
- Should manual goals support a manual contribution entry later? Yes, but not in this change.
