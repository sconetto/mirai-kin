# Equity

## Purpose

Report net worth, its composition, and a dated snapshot history.

## Requirements

### Requirement: Net worth
The system SHALL compute net worth as total assets minus total liabilities in the base currency through one canonical domain service used by the equity page, planner, dashboard, snapshots, and plan-status API, and SHALL count investment positions, account balances, and manual assets without double-counting.

#### Scenario: Net worth summary
- **WHEN** the user opens equity
- **THEN** the system shows total assets, total liabilities, and net worth

#### Scenario: Investment account with positions
- **WHEN** an investment account has recorded positions
- **THEN** the system uses the positions' market value and does not also add the account's transaction-derived balance

#### Scenario: Investment account without positions
- **WHEN** an investment account has no recorded positions
- **THEN** the system uses the account balance as the fallback valuation

#### Scenario: Shared consumers
- **WHEN** the planner, dashboard, or API requests net worth on the same date
- **THEN** they receive the same assets, liabilities, and net figures

#### Scenario: Manual assets
- **WHEN** a manual estate asset exists
- **THEN** the system includes it exactly once in assets

### Requirement: Composition
The system SHALL break net worth down by asset class — cash/savings, financial investments, real estate, vehicles, other assets, and liabilities — and by currency. Each component SHALL expose its asset class and its configured or default annual growth rate for use by projections.

#### Scenario: Composition breakdown
- **WHEN** the user views the composition
- **THEN** assets and liabilities are grouped by asset class with base-currency values

#### Scenario: Vehicle assets
- **WHEN** an account has `assetSubtype=vehicle`
- **THEN** its value is grouped under vehicles rather than investments

#### Scenario: Real-estate assets
- **WHEN** an account or manual asset is classified as real estate
- **THEN** its value is grouped under real estate

#### Scenario: Investment positions
- **WHEN** an investment account has recorded positions
- **THEN** the positions are grouped under financial investments and the account balance is not double-counted

#### Scenario: Growth-rate override
- **WHEN** an account has an explicit growth rate
- **THEN** that rate overrides the asset-class default for projection purposes

#### Scenario: Liabilities
- **WHEN** credit-card, loan, or mortgage accounts exist
- **THEN** their balances are grouped under liabilities

### Requirement: Snapshot history
The system SHALL record dated net-worth snapshots and SHALL chart the trend across recorded dates.

#### Scenario: Trend chart
- **WHEN** snapshots exist
- **THEN** the system charts net worth over the recorded dates

### Requirement: Immutable history
The system SHALL NOT recompute historical snapshots when exchange rates or balances later change.

#### Scenario: Rate change after snapshot
- **WHEN** exchange rates change after a snapshot was recorded
- **THEN** the stored snapshot remains unchanged

### Requirement: Drill-down
The system SHALL link each composition component to its underlying accounts, investments, or debts.

#### Scenario: Drill-down
- **WHEN** a user selects a component
- **THEN** the system opens the relevant detail view
