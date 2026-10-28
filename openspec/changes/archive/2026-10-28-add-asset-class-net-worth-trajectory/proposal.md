## Why

The current net-worth trajectory applies one blended return to the entire net worth. That makes savings accounts, financial investments, vehicles, and real estate follow the same curve even though they behave very differently. The dashboard composition also lumps vehicles and other assets into "Investments", so the overview misrepresents both the current mix and its future direction.

## What Changes

- Add asset-class composition for net worth: cash/savings, financial investments, real estate, vehicles, other appreciating assets, other depreciating assets, and liabilities.
- Add optional per-account and per-manual-asset annual growth rates, with class-based defaults.
- Project each asset class with its own growth rule instead of one blended return.
- Allocate goal contributions to financial assets only; never to vehicles or real estate.
- Keep account liabilities flat for now; do not include the separate `entities` or `debts` tables in net worth yet.
- Revise the dashboard composition to show the asset classes separately.
- Revise the net-worth trajectory chart to show net worth only, use a padded y-axis, mark "Today", and move goal targets into a separate goal rail.
- Expose the effective per-class assumptions in the trajectory card.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `equity`: net-worth composition now uses asset classes, and components expose growth-rate metadata.
- `projections`: the long-horizon net-worth trajectory now projects each asset class independently and allocates contributions to financial assets.
- `plan-dashboard`: the composition and trajectory requirements now use asset classes, a net-worth-only chart, and a separate goal-target rail.

## Impact

- **Schema**: nullable growth-rate fields on accounts and manual estate assets; migration.
- **Services**: equity classification and growth metadata; asset-class trajectory; dashboard composition.
- **UI**: account/asset growth-rate controls; composition labels/colors; revised trajectory chart and goal rail.
- **Tests**: asset-class classification, per-class growth, contribution allocation, composition buckets, and chart data contract.
- **Explicitly out of scope**: entities, the debts table, debt amortization, and per-position growth overrides.
