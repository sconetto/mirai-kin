## 1. Data model

- [x] 1.1 Add entity tables and migration for loans, properties, vehicles, credit cards, subscriptions, and bills.
- [x] 1.2 Add account linking and currency fields.

## 2. Calculations

- [x] 2.1 Add loan payoff/payment derivation via amortization helpers.
- [x] 2.2 Add subscription/bill upcoming-due derivation.
- [x] 2.3 Add property/vehicle appreciation/depreciation derivation.

## 3. UI

- [x] 3.1 Add entity list and detail pages with navigation.
- [x] 3.2 Render derived figures on each entity screen.
- [x] 3.3 Ensure no transaction-creation actions exist on entity screens.

## 4. Verification

- [x] 4.1 Add tests for each entity's derived figures and the read-only constraint.
- [x] 4.2 Run `pnpm typecheck`, `pnpm lint`, and `pnpm test`.
