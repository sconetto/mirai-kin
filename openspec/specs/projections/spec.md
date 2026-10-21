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
The system SHALL project net worth over a configurable multi-year horizon using starting net worth, planned goal contributions, expected nominal return, and inflation, while retaining the existing short-term cash-flow forecast. The projection SHALL NOT subtract scheduled debt principal because liabilities are already reflected in net worth, and SHALL expose scheduled debt service separately as a memo.

#### Scenario: Ten-year trajectory
- **WHEN** a trajectory is requested for a ten-year horizon
- **THEN** the system returns a dated series derived from net worth, contributions, returns, and inflation

#### Scenario: No goals
- **WHEN** no goal contributions exist
- **THEN** the trajectory still projects net worth from the configured return and inflation assumptions

#### Scenario: Debt treatment
- **WHEN** scheduled debt payments exist
- **THEN** the trajectory reports them as debt service without subtracting principal from projected net worth

### Requirement: Trajectory assumptions
The system SHALL apply conservative, base, and optimistic assumptions to the net-worth trajectory, SHALL allow the selected scenario to override return, inflation, contribution, and horizon, and SHALL return the effective assumptions with the result.

#### Scenario: Assumption transparency
- **WHEN** a trajectory response is produced
- **THEN** it includes the effective return, inflation, contribution, and horizon used for each scenario

#### Scenario: Scenario override
- **WHEN** a saved scenario is selected for the trajectory
- **THEN** the projection uses the scenario's overrides and inherits unset values from the base plan

#### Scenario: No scenario selected
- **WHEN** no scenario is selected
- **THEN** the projection uses the base plan assumptions

### Requirement: Deterministic trajectory
The system SHALL produce identical trajectory figures when run twice with identical inputs and assumptions.

#### Scenario: Reproducible trajectory
- **WHEN** the same plan is projected twice without changing data or assumptions
- **THEN** the resulting series are identical
