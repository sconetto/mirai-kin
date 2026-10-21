# Equity

## Purpose

Report net worth, its composition, and a dated snapshot history.

## Requirements

### Requirement: Net worth
The system SHALL compute net worth as total assets minus total liabilities in the base currency.

#### Scenario: Net worth summary
- **WHEN** the user opens equity
- **THEN** the system shows total assets, total liabilities, and net worth

### Requirement: Composition
The system SHALL break net worth down by account type (cash, investments, property/assets, credit cards, loans, mortgages) and by currency.

#### Scenario: Composition breakdown
- **WHEN** the user views the composition
- **THEN** assets and liabilities are grouped by type with base-currency values

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
