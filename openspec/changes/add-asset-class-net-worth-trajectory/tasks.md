## 1. Data model and classification

- [x] 1.1 Add nullable `growthRate` columns to accounts and manual estate assets, plus a migration.
- [x] 1.2 Add a shared asset-class classifier for cash, financial investments, real estate, vehicles, other appreciating, other depreciating, and liabilities.
- [x] 1.3 Expose the per-account growth-rate override in account schemas, API, and the account edit form.
- [x] 1.4 Add unit tests for account/asset classification and growth-rate overrides.

## 2. Equity and composition

- [x] 2.1 Extend equity components with asset class and configured/default growth-rate metadata.
- [x] 2.2 Update dashboard composition keys, colors, labels, and calculations for cash, investments, real estate, vehicles, other assets, and liabilities.
- [x] 2.3 Add tests for vehicle/real-estate classification, investment positions, manual assets, and liabilities.

## 3. Asset-class trajectory

- [x] 3.1 Add default nominal growth rates for each asset class and convert them to real monthly rates using scenario inflation.
- [x] 3.2 Project each asset class independently and sum assets minus flat account liabilities.
- [x] 3.3 Split planned contributions between cash and investments proportionally, or entirely to investments when both are zero.
- [x] 3.4 Return effective per-class assumptions with the trajectory response.
- [x] 3.5 Add tests for savings, investments, real estate, vehicles, other assets, contribution allocation, no goals, and flat liabilities.

## 4. Dashboard trajectory UI

- [x] 4.1 Remove goal dots from the net-worth chart and render a separate goal rail with name, target date, target amount, and status.
- [x] 4.2 Use a padded y-axis around actual and projected values and add a Today reference marker.
- [x] 4.3 Show the per-class growth assumptions in the trajectory card.
- [x] 4.4 Update the accessible summary and responsive behavior for the revised chart and goal rail.

## 5. Verification

- [x] 5.1 Add or update dashboard data-contract coverage for composition buckets and per-class trajectory assumptions.
- [x] 5.2 Run `pnpm typecheck`, `pnpm lint`, and `pnpm test`.
- [x] 5.3 Visually verify the revised trajectory and composition on the overview, including vehicles and real estate.
- [x] 5.4 Run `pnpm test:e2e` and clean up any test-created data.
