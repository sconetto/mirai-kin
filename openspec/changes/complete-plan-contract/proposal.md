## Why

The goal-trajectory and plan-dashboard specs are synced and the features ship, but several requirements are only partially implemented: the movement bridge does not separate debt service and FX from market movement, contribution pace uses net savings instead of tracked goal contributions, the plan-status contract omits the FX rate date, and the long-horizon trajectory does not state its horizon or clarify how scheduled debt is treated. This change closes those gaps before the completed proposals are archived.

## What Changes

- Split the dashboard movement bridge into income, spending, market movement, FX effect, and a separate debt-service memo that does not double-count principal already reflected in net worth.
- Add transfer-derived goal contribution tracking: transfers into a goal's allocated accounts from outside that goal count as tracked contributions.
- Use tracked contributions for contribution pace when available, with net savings as a documented fallback for manual goals.
- Return the FX rate date from the plan-status contract and the horizon from the long-horizon trajectory assumptions.
- Document and enforce the debt decision: net-worth trajectory does not subtract debt principal because liabilities are already included; scheduled debt service is exposed separately.
- Add regression coverage for movement decomposition, tracked contributions, rate date, horizon, and debt-service memo behavior.
- Out of scope: editable scenario management (`add-scenario-lab`), Monte Carlo modeling, and per-goal manual contribution entry.

## Capabilities

### New Capabilities

- `goal-contributions`: Transfer-derived contribution tracking for account-funded goals, with a documented net-savings fallback.

### Modified Capabilities

- `plan-dashboard`: Movement bridge decomposes debt service and FX; contribution pace distinguishes tracked contributions from the fallback.
- `goal-trajectory`: Plan-status returns the FX rate date used for base-currency conversion.
- `projections`: Long-horizon trajectory reports its horizon and clarifies that scheduled debt principal is not double-counted; debt service is exposed separately.

## Impact

- **Services**: dashboard movement, contribution pace, plan status, and trajectory assumptions.
- **Data**: snapshot breakdown gains a native value per component so FX revaluation can be separated; existing snapshots without native values fall back to a combined market/FX residual.
- **UI**: movement chart gains FX and debt-service rows; contribution pace labels its source.
- **API**: plan-status adds `rateDate`; trajectory assumptions add `horizonMonths`.
- **Tests**: movement reconciliation with and without native snapshot data, tracked contribution detection, rate date, and horizon.
