# Reconciliation

## ADDED Requirements

### Requirement: Opening balances
The system SHALL capture an opening balance for every account and SHALL flag accounts that do not have one.

#### Scenario: Missing opening balance
- **WHEN** an account has no opening balance recorded
- **THEN** the data-quality view lists the account for review

### Requirement: Import with opening or current balance
The system SHALL allow an import to supply an opening balance or a current statement balance, deriving the opening balance when a current balance is provided.

#### Scenario: Derive opening balance
- **WHEN** an import provides a current balance for an account
- **THEN** the system computes the opening balance as the current balance minus the imported transactions

### Requirement: Statement reconciliation
The system SHALL allow a user to reconcile an account by entering a statement balance for a date and SHALL report the difference against the computed balance.

#### Scenario: Reconciled statement
- **WHEN** the entered statement balance equals the computed balance
- **THEN** the reconciliation is stored as reconciled

#### Scenario: Discrepancy
- **WHEN** the entered statement balance differs from the computed balance
- **THEN** the reconciliation is stored as a discrepancy with the difference

### Requirement: Reconciliation history
The system SHALL keep a history of reconciliations per account.

#### Scenario: View history
- **WHEN** a user opens an account's reconciliation history
- **THEN** the system lists prior reconciliations with dates, balances, and statuses

### Requirement: Credit-card cycles
The system SHALL support credit-card closing day, due day, and credit limit, and SHALL present the current cycle's transactions and total.

#### Scenario: Current cycle
- **WHEN** a credit-card account has cycle fields configured
- **THEN** the system shows the current cycle's transactions, total, and due date

### Requirement: Data-quality dashboard
The system SHALL provide a read-only data-quality view covering uncategorized records, potential duplicates, unpaired transfers, records missing an FX rate, stale investment prices, and accounts without an opening balance.

#### Scenario: Data-quality summary
- **WHEN** a user opens data quality
- **THEN** the system shows each issue type with a count and a link to the affected records
