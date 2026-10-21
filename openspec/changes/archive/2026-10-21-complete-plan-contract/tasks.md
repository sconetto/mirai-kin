## 1. Snapshot and equity data

- [x] 1.1 Add `nativeValue` to `EquityComponent` and populate it for accounts, positions, and manual assets.
- [x] 1.2 Persist `nativeValue` in snapshot breakdowns and keep older snapshots valid through the fallback.
- [x] 1.3 Add tests for native values in equity components and snapshots.

## 2. Movement decomposition

- [x] 2.1 Extend `DashboardMovement` with `fx`, `market`, `debtService`, and a flag for whether FX separation was available.
- [x] 2.2 Compute FX from opening snapshot native values and closing rates; fall back to a combined Market & FX residual when native values are missing.
- [x] 2.3 Compute scheduled debt service between the movement dates as a memo.
- [x] 2.4 Update the movement waterfall to render FX and the debt-service memo without breaking reconciliation.
- [x] 2.5 Add movement tests for reconciliation, FX separation, fallback, and debt memo.

## 3. Tracked contributions

- [x] 3.1 Add a tracked-contribution service that finds transfers into goal allocations from outside the goal and converts them to base currency.
- [x] 3.2 Exclude internal goal transfers and manual goals, and restrict tracking to the selected period.
- [x] 3.3 Extend contribution pace with a `tracked` vs `net_savings` source and use tracked contributions when available.
- [x] 3.4 Update the pace UI and localized copy to label the source.
- [x] 3.5 Add tests for tracked contributions, internal transfers, manual goals, and period boundaries.

## 4. Contract fields

- [x] 4.1 Return `rateDate` from plan status and each goal.
- [x] 4.2 Return `horizonMonths` from trajectory assumptions.
- [x] 4.3 Update OpenAPI/response documentation and tests.

## 5. Verification

- [x] 5.1 Run `pnpm typecheck`, `pnpm lint`, and the unit suite.
- [x] 5.2 Run the Playwright suite and verify the populated dashboard in pt-BR and en.
- [x] 5.3 Run `openspec validate complete-plan-contract --strict`.
