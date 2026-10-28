## Context

Net worth currently comes from one canonical `getEquity` service: account balances, investment positions, and manual estate assets, minus account liabilities. The dashboard trajectory then projects total net worth with one weighted-average nominal return, one inflation rate, and one monthly contribution.

That model cannot represent different asset behavior. Vehicles are imported as investment accounts with `assetSubtype=vehicle`, so they appear as investments and are projected as if they appreciate. Real estate is treated like any other asset. Savings accounts earn the same blended return as equities. Goal targets are plotted on the net-worth axis even though they are funding targets, which forces the y-axis down and compresses the projection.

Entities and the separate `debts` table are not part of this change. The current net-worth sources remain accounts, investment positions, manual estate assets, and account liabilities.

## Goals / Non-Goals

**Goals:**

- Classify net worth into cash/savings, financial investments, real estate, vehicles, other assets, and liabilities.
- Project each class with its own annual growth rule.
- Allow per-account growth-rate overrides, with class-based defaults.
- Keep goal contributions in financial assets only.
- Make the dashboard composition and trajectory chart reflect the new model.
- Make the trajectory chart readable: net-worth-only, padded axis, Today marker, goal rail, visible assumptions.

**Non-Goals:**

- Including `entities` or the `debts` table in net worth.
- Debt amortization or separate debt-service modeling.
- Per-investment-position growth overrides.
- Changing the short-term cash-flow forecast.
- Automatically modeling asset purchases/sales as composition shifts.

## Decisions

### 1. Asset-class classification

Add a shared classifier used by equity, dashboard composition, and trajectory:

- **Cash/savings**: account types `checking`, `savings`, `cash`.
- **Financial investments**: investment accounts with positions, and investment accounts with `assetSubtype` `stocks`, `fiis`, `crypto`, or no subtype.
- **Real estate**: investment accounts with `assetSubtype=real_estate`; manual estate assets whose type is `real_estate` or `property`.
- **Vehicles**: investment accounts with `assetSubtype=vehicle`; manual estate assets whose type is `vehicle`.
- **Other appreciating**: `assetSubtype=other_appreciating`; estate assets not matching another class.
- **Other depreciating**: `assetSubtype=other_depreciating`.
- **Liabilities**: account types `credit_card`, `loan`, `mortgage`.

Investment accounts with positions are always financial investments, regardless of subtype, because their value comes from positions.

### 2. Growth rates are nominal annual rates

Store optional `growthRate` values as nominal annual rates. Convert to real monthly rates using the scenario inflation assumption before projecting. This keeps the existing real-terms trajectory and matches the current goal `expectedReturn` semantics.

Defaults when no override exists:

| Class | Default nominal growth |
|---|---|
| Cash/savings | inflation rate (0% real) |
| Financial investments | scenario expected return |
| Real estate | 5% |
| Vehicles | −12% |
| Other appreciating | inflation rate (0% real) |
| Other depreciating | inflation rate (0% real) |
| Liabilities | 0% (flat) |

Per-account `growthRate` overrides the class default. Manual estate assets may also store a growth rate; if absent, use the class default.

### 3. Contributions go to financial assets

Goal contributions are split between cash and investments in proportion to their current balances. If both are zero, all contributions go to investments. Contributions never go to vehicles, real estate, or other assets.

This keeps the current “contributions earn a financial return” behavior while avoiding arbitrary allocation to depreciating assets.

### 4. Asset classes grow independently

For each projection month:

1. Compound each asset class at its own real monthly rate.
2. Add the contribution split to cash and investments.
3. Keep account liabilities flat.
4. Sum assets minus liabilities for the net-worth point.

The conservative/base/optimistic band applies only to the financial-investment return. Real estate, vehicles, other assets, cash, and liabilities use their configured deterministic rates.

### 5. Schema

Add nullable `growthRate` numeric columns to `accounts` and `estateAssets`. No new asset-class column is needed; classification uses existing `type` and `assetSubtype`.

### 6. Dashboard composition and chart

Composition keys become `cash`, `investments`, `realEstate`, `vehicles`, `otherAssets`, and `liabilities`. The trajectory chart becomes net-worth-only:

- padded y-axis around actual/projected values,
- solid actual history with dots when available,
- dashed base projection,
- shaded conservative/optimistic band,
- vertical Today marker,
- separate goal rail below the chart,
- compact per-class assumption summary.

## Risks / Trade-offs

- **Default rates are assumptions, not predictions** → expose them and allow per-account overrides; revise defaults as needed.
- **Contributions split proportionally can surprise users** → document the rule and keep goal-specific allocation as a future extension.
- **Vehicles may be imported as investment accounts** → classification must prefer `assetSubtype` over account type.
- **Manual estate assets have free-form types** → map known values and default unknown assets to other-appreciating.
- **Liabilities stay flat** → the projection will overstate net-worth improvement if debt is actually amortizing; this is deliberate until debt modeling lands.
- **Chart complexity** → keep the main chart net-worth-only and move goals to a separate rail.

## Migration Plan

- Add nullable growth-rate columns; existing rows use class defaults, so no data backfill is required.
- Update account forms to expose the override.
- No changes to entities, debts, or the short-term forecast.

## Open Questions

- Should contributions eventually be assigned per goal or per funding account instead of split proportionally? Deferred.
- Should real estate/vehicle rates get their own uncertainty bands? Deferred.
