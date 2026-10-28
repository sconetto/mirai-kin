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
The system SHALL project net worth over a configurable multi-year horizon by compounding each asset class at its own annual growth rate, adding planned goal contributions to financial assets, and keeping account liabilities flat. The separate `entities` and `debts` tables SHALL be excluded from this projection. The projection SHALL retain the existing short-term cash-flow forecast.

#### Scenario: Ten-year trajectory
- **WHEN** a trajectory is requested for a ten-year horizon
- **THEN** the system returns a dated net-worth series derived from each asset class's balance and growth rate

#### Scenario: No goals
- **WHEN** no goal contributions exist
- **THEN** the trajectory still projects net worth from existing asset-class balances and growth assumptions

#### Scenario: Asset-class growth
- **WHEN** the plan contains cash, financial investments, real estate, vehicles, and other assets
- **THEN** each class follows its own growth rule rather than one blended return

#### Scenario: Contributions stay financial
- **WHEN** planned goal contributions exist
- **THEN** they are added to cash and financial investments only, never to vehicles or real estate

#### Scenario: Liabilities stay flat
- **WHEN** credit-card, loan, or mortgage account balances exist
- **THEN** the projection subtracts the current liability balance without modeling amortization

#### Scenario: Separate debt records excluded
- **WHEN** the separate debts table contains scheduled debt
- **THEN** that debt is not included in this projection until dedicated debt modeling is added

### Requirement: Trajectory assumptions
The system SHALL apply conservative, base, and optimistic assumptions to the net-worth trajectory, SHALL allow the selected scenario to override return, inflation, contribution, and horizon, and SHALL return the effective per-class assumptions with the result.

#### Scenario: Assumption transparency
- **WHEN** a trajectory response is produced
- **THEN** it includes the effective financial-investment return band, inflation, contribution, horizon, and the growth rate used for each asset class

#### Scenario: Scenario override
- **WHEN** a saved scenario is selected for the trajectory
- **THEN** the projection uses the scenario's overrides and inherits unset values from the base plan

#### Scenario: No scenario selected
- **WHEN** no scenario is selected
- **THEN** the projection uses the base plan assumptions

#### Scenario: Per-account override
- **WHEN** an account has an explicit growth rate
- **THEN** the trajectory uses that rate instead of the class default for that account

### Requirement: Asset-class growth assumptions
The system SHALL define default annual growth assumptions for cash/savings, financial investments, real estate, vehicles, other appreciating assets, other depreciating assets, and liabilities, and SHALL allow per-account overrides.

#### Scenario: Cash and savings
- **WHEN** a cash or savings account has no explicit growth rate
- **THEN** it grows at the inflation assumption, representing 0% real growth

#### Scenario: Financial investments
- **WHEN** financial investments have no explicit growth rate
- **THEN** they use the scenario's expected return, with the conservative/optimistic band applied only to this class

#### Scenario: Real estate
- **WHEN** a real-estate asset has no explicit growth rate
- **THEN** it appreciates at the default real-estate rate

#### Scenario: Vehicles
- **WHEN** a vehicle asset has no explicit growth rate
- **THEN** it depreciates at the default vehicle rate

#### Scenario: Other assets
- **WHEN** another asset has no explicit growth rate
- **THEN** it grows at the default rate for its appreciating or depreciating class

#### Scenario: Contribution allocation
- **WHEN** planned contributions are added during the projection
- **THEN** they are split between cash and financial investments in proportion to their current balances, or entirely to investments when both are zero

#### Scenario: Nominal-to-real conversion
- **WHEN** a nominal annual growth rate is applied to a projection
- **THEN** the system converts it to a real monthly rate using the scenario inflation assumption

### Requirement: Deterministic trajectory
The system SHALL produce identical trajectory figures when run twice with identical inputs and assumptions.

#### Scenario: Reproducible trajectory
- **WHEN** the same plan is projected twice without changing data or assumptions
- **THEN** the resulting series are identical
