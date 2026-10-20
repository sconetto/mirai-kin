# Projections

## ADDED Requirements

### Requirement: Recurring transactions
The system SHALL allow defining recurring transactions with an amount, currency, category, account, frequency, and optional end date.

#### Scenario: Define monthly recurring transaction
- **WHEN** a user defines a recurring transaction with a monthly frequency
- **THEN** the system stores it for use in projections

### Requirement: Cash-flow forecast
The system SHALL generate a future cash-flow forecast over a configurable horizon by expanding recurring transactions, debt schedules, and current balances.

#### Scenario: Forecast expansion
- **WHEN** a forecast is requested for a 12-month horizon
- **THEN** the system returns projected cash flow per period, including recurring transactions and scheduled debt payments

#### Scenario: Series respects end date
- **WHEN** a recurring transaction has an end date
- **THEN** the forecast does not include occurrences beyond that date

### Requirement: Base-currency projection
The system SHALL report projected cash flow in the base currency using active exchange rates.

#### Scenario: Multi-currency forecast
- **WHEN** recurring transactions are defined in multiple currencies
- **THEN** the forecast aggregates them in the base currency using active rates
