# Budgets

## ADDED Requirements

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
