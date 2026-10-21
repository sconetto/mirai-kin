# Projections

## Purpose

Forecast future cash flow from recurring transactions and debt schedules.

## Requirements

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

### Requirement: Scenario assumptions
The system SHALL support base, optimistic, and pessimistic forecast scenarios with configurable income growth, inflation, and return assumptions.

#### Scenario: Scenario output
- **WHEN** a scenario is selected
- **THEN** the forecast applies its assumptions to the projected periods

### Requirement: Reproducible output
The system SHALL produce deterministic projections from the configured assumptions.

#### Scenario: Same inputs, same output
- **WHEN** a projection is run twice with identical inputs and assumptions
- **THEN** the resulting figures are identical

### Requirement: Long-horizon net-worth trajectory
The system SHALL project net worth over a configurable multi-year horizon using starting net worth, planned goal contributions, expected nominal return, inflation, and scheduled debt payments, while retaining the existing short-term cash-flow forecast.

#### Scenario: Ten-year trajectory
- **WHEN** a trajectory is requested for a ten-year horizon
- **THEN** the system returns a dated series derived from net worth, contributions, returns, inflation, and debt payments

#### Scenario: No goals
- **WHEN** no goal contributions exist
- **THEN** the trajectory still projects net worth from the configured return, inflation, and debt assumptions

### Requirement: Trajectory assumptions
The system SHALL apply conservative, base, and optimistic assumptions to the net-worth trajectory and SHALL return the assumptions with the result.

#### Scenario: Assumption transparency
- **WHEN** a trajectory response is produced
- **THEN** it includes the return, inflation, contribution, and horizon used for each scenario

### Requirement: Deterministic trajectory
The system SHALL produce identical trajectory figures when run twice with identical inputs and assumptions.

#### Scenario: Reproducible trajectory
- **WHEN** the same plan is projected twice without changing data or assumptions
- **THEN** the resulting series are identical
