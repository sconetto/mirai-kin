# Budgets

## Purpose

Set scoped spending limits and compare them with actual activity.

## Requirements

### Requirement: Budget lifecycle
The system SHALL allow creating, reading, updating, and deleting budgets, each with a name, period type, amount, and optional date range.

#### Scenario: Create budget
- **WHEN** a user creates a budget with a name, period, and amount
- **THEN** the system stores it and returns it with a generated id

### Requirement: Budget scope
The system SHALL allow scoping a budget to specific accounts, categories, or labels; when no scope is set, the budget applies to all spending.

#### Scenario: Scoped budget counts only matching records
- **WHEN** a budget is scoped to a category
- **THEN** only transactions in that category contribute to the budget's spend

#### Scenario: Unscoped budget counts all spending
- **WHEN** a budget has no scope
- **THEN** all expense transactions contribute to the budget's spend

### Requirement: Spend tracking
The system SHALL compute each budget's spend for its period as the sum of matching expense transactions (in the base currency) and SHALL report spend versus the budget amount.

#### Scenario: Over-budget detection
- **WHEN** a budget's spend exceeds its amount within the period
- **THEN** the system reports the budget as over budget with the surplus amount

#### Scenario: Income netting
- **WHEN** a budget period contains income in a scoped category
- **THEN** spend is reported as `max(0, expenses - income)` for that scope

### Requirement: Variance and alerts
The system SHALL report each budget's variance (amount minus spend, absolute and percentage) and SHALL alert when a budget is over its limit or close to it.

#### Scenario: Near-limit alert
- **WHEN** a budget's spend crosses the configured near-limit threshold
- **THEN** the system surfaces a warning for that budget

#### Scenario: Over-limit alert
- **WHEN** a budget's spend exceeds its amount
- **THEN** the system surfaces an over-budget alert

### Requirement: Budget review
The system SHALL provide a review view that compares actual spending with the budget by category for the period.

#### Scenario: Review by category
- **WHEN** a user opens the budget review
- **THEN** the system lists each scoped category with budgeted and actual amounts and the difference

### Requirement: Period comparison
The system SHALL compare a budget period against the previous period.

#### Scenario: Previous period
- **WHEN** a user enables period comparison
- **THEN** the system shows spend and variance for the current and previous periods
