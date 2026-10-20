# Transactions

## ADDED Requirements

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

### Requirement: Transaction querying
The system SHALL allow filtering transactions by account, category, label, date range, amount range, and payment type, with pagination and sorting.

#### Scenario: Filter by category and date
- **WHEN** a user queries transactions by category and date range
- **THEN** the system returns only matching transactions, ordered and paginated

### Requirement: Transaction update and delete
The system SHALL allow updating and deleting transactions, re-resolving the snapshot when amount, currency, or date changes.

#### Scenario: Update re-resolves snapshot
- **WHEN** a transaction's currency or date is changed
- **THEN** the system recomputes the base-amount snapshot for the new values

#### Scenario: Delete transaction
- **WHEN** a user deletes a transaction
- **THEN** the system removes it and any labels referencing only it are unaffected

### Requirement: Payment types
The system SHALL support a fixed set of payment types including cash, debit card, credit card, transfer, pix, boleto, and ted.

#### Scenario: Unsupported payment type rejected
- **WHEN** a transaction is created with an unsupported payment type
- **THEN** the system rejects the request with a validation error
