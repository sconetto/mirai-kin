## Context

The app already has `accounts`, `debts`, and asset subtypes, but no screens for loans vs. properties vs. vehicles vs. credit cards vs. subscriptions vs. bills. The constraint is that transactions are always imported, never created in-app.

## Goals / Non-Goals

**Goals:**

- One screen per entity type with its own fields and derived figures.
- Read-only views: display and computation only, no transaction creation.
- Link entities to imported accounts and transactions where meaningful.

**Non-Goals:**

- Manual transaction entry.
- Full bank/credit-card sync.
- Portfolio-level investment modeling beyond the existing investments screen.

## Decisions

### 1. Entity model

Add lightweight entity tables keyed by id with type-specific fields (loans: balance/rate/term; properties/vehicles: value, acquired date; credit cards: limit/due day; subscriptions/bills: amount/frequency/due date). Keep amounts in a currency column.

### 2. Read-only discipline

Entity screens expose no "add transaction" action. Any numeric input is a manual balance/value field, never a transaction row.

### 3. Derived figures

Compute loan payoff/payment via the existing amortization helpers; subscriptions/bills surface upcoming due amount from recurring data; properties/vehicles surface appreciation/depreciation from entered assumptions.

### 4. Linking

Entities link to an account id where an imported account represents the vehicle/credit card/loan, reusing account values rather than duplicating balances.
