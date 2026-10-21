## MODIFIED Requirements

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
