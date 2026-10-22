## Why

Loans, properties, vehicles, credit cards, subscriptions, and bills currently live implicitly inside accounts and debts, with no dedicated screens for their specific math (payoff, appreciation/depreciation, due dates, recurring charges). A plan-first app benefits from first-class views over these items, even though it never creates the underlying transactions.

## What Changes

- Add dedicated, read-only screens for: loans, properties, vehicles, credit cards, subscriptions, and bills.
- Model the essential fields per entity (balance, rate, term, due date, value, etc.).
- Display derived figures (payoff date, monthly payment, appreciation/depreciation, upcoming due amount).
- Link each entity to imported accounts/transactions where applicable.
- Enforce the import-only rule: these screens never create transactions.

## Capabilities

### New Capabilities

- `entities`: first-class, read-only views over loans, properties, vehicles, credit cards, subscriptions, and bills.

### Modified Capabilities

- `debts`: loans become a specialized debt view.
- `accounts`: credit cards and subscriptions surface account-linked data.

## Impact

- **Schema**: entity tables (or JSON fields) with a migration, plus account/debt relationships.
- **Services**: entity queries and derived calculations.
- **UI**: new entity pages and navigation.
- **Tests**: entity calculations and the read-only constraint.
