# Data Import

## ADDED Requirements

### Requirement: CSV transaction import
The system SHALL allow importing transactions from a CSV file, mapping columns to amount, currency, category, date, note, payment type, account, and counterparty.

#### Scenario: Import valid CSV
- **WHEN** a user uploads a well-formed CSV with recognizable columns
- **THEN** the system imports the transactions and returns a summary of rows written and rows skipped

#### Scenario: Import reports errors per row
- **WHEN** a CSV contains invalid rows
- **THEN** the system reports per-row failures without aborting valid rows

### Requirement: Import validation
The system SHALL validate imported rows against the same schema as direct creation and SHALL reject rows with invalid enums, missing required fields, or unknown accounts/categories.

#### Scenario: Unknown category
- **WHEN** a CSV references an account or category that does not exist
- **THEN** the system flags that row as failed and skips it

### Requirement: Import is idempotent
The system SHALL prevent duplicate imports of the same file content using a fingerprint or idempotency key.

#### Scenario: Re-import same file
- **WHEN** the same CSV content is imported twice with the same key
- **THEN** the system does not create duplicate transactions on the second import
