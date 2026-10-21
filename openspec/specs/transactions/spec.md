# Transactions

## Purpose

Maintain the reviewed ledger that every report and insight is built on.

## Requirements

### Requirement: Transaction fields
The system SHALL store transactions with amount, currency, category, date and time, note, payment type, account, counterparty, and labels.

#### Scenario: Create full transaction
- **WHEN** a user creates a transaction with all supported fields
- **THEN** the system stores and returns the complete transaction

#### Scenario: Minimal transaction
- **WHEN** a user creates a transaction with only amount, currency, account, and date
- **THEN** the system accepts it and applies defaults for optional fields

### Requirement: Multi-currency snapshot
The system SHALL record each transaction in its native amount and currency and SHALL compute and store a base-amount snapshot (`base_amount`/`base_currency`) resolved against the exchange rate active on the transaction date.

#### Scenario: Snapshot captured at creation
- **WHEN** a transaction is created in a non-base currency
- **THEN** the system stores both the native amount and a base-amount snapshot derived from the rate on the transaction date

#### Scenario: Snapshot stable across rate changes
- **WHEN** exchange rates change after a transaction is recorded
- **THEN** the transaction's stored base-amount does not change

### Requirement: Import-first creation
The system SHALL treat import as the primary creation path and SHALL keep manual creation available for corrections.

#### Scenario: Manual correction
- **WHEN** a user manually creates or edits a transaction
- **THEN** it is stored with the same validation and snapshot behavior as imported transactions

### Requirement: Transaction querying
The system SHALL allow filtering transactions by account, category, label, date range, amount range, review status, and payment type, with pagination and sorting.

#### Scenario: Filter by category and date
- **WHEN** a user queries transactions by category and date range
- **THEN** the system returns only matching transactions, ordered and paginated

### Requirement: Review workflow
The system SHALL support a reviewed status and SHALL allow bulk recategorization, merging duplicate transactions, and splitting a transaction into parts.

#### Scenario: Bulk recategorize
- **WHEN** a user selects multiple transactions and applies a category
- **THEN** all selected transactions are updated and marked reviewed

#### Scenario: Merge duplicates
- **WHEN** a user merges two duplicate transactions
- **THEN** one record remains and the removed record no longer contributes to reports

#### Scenario: Split a transaction
- **WHEN** a user splits a transaction into parts
- **THEN** the parts sum to the original amount and the original is no longer counted separately

### Requirement: Recurring detection
The system SHALL detect recurring transactions and SHALL show upcoming bills and subscriptions.

#### Scenario: Upcoming bills
- **WHEN** recurring patterns exist in the reviewed data
- **THEN** the system lists the next expected occurrences

### Requirement: Transaction update and delete
The system SHALL allow updating and deleting transactions, re-resolving the snapshot when amount, currency, or date changes.

#### Scenario: Update re-resolves snapshot
- **WHEN** a transaction's currency or date is changed
- **THEN** the system recomputes the base-amount snapshot for the new values

#### Scenario: Delete transaction
- **WHEN** a user deletes a transaction
- **THEN** the system removes it and it no longer contributes to reports

### Requirement: Payment types
The system SHALL support a fixed set of payment types including cash, debit card, credit card, transfer, pix, boleto, and ted.

#### Scenario: Unsupported payment type rejected
- **WHEN** a transaction is created with an unsupported payment type
- **THEN** the system rejects the request with a validation error
