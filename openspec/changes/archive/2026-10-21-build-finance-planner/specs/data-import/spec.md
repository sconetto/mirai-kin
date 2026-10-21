# Data Import

## ADDED Requirements

### Requirement: Import sources
The system SHALL import data from CSV, OFX, and brokerage CSV files, and SHALL support agent-assisted Wallet MCP imports through the REST API.

#### Scenario: CSV import
- **WHEN** a user imports a CSV file
- **THEN** the system stages the rows for review before committing them

#### Scenario: OFX import
- **WHEN** a user imports an OFX bank statement
- **THEN** the system parses its transactions into staged rows

#### Scenario: Wallet MCP-assisted import
- **WHEN** an agent reads Wallet data through the MCP and writes it through `/api/v1`
- **THEN** the records follow the same validation and deduplication rules as a file import

### Requirement: Mapping profiles
The system SHALL allow saving a column mapping for a source/account and reusing it on later imports.

#### Scenario: Reuse a mapping
- **WHEN** a user imports a file with a previously saved mapping profile
- **THEN** the columns are pre-mapped without re-entry

### Requirement: Staging and review
The system SHALL stage imported rows and SHALL let the user review, edit, and confirm them before they become transactions.

#### Scenario: Review before commit
- **WHEN** rows are staged
- **THEN** the user can inspect and correct them and choose which rows to commit

### Requirement: Per-row validation
The system SHALL validate each row against the same schema as direct creation and SHALL report per-row errors without aborting valid rows.

#### Scenario: Invalid row
- **WHEN** a row has an invalid date, amount, or unknown account/category
- **THEN** the system flags that row and skips it while valid rows remain importable

### Requirement: Deduplication
The system SHALL detect likely duplicate rows using a fingerprint and a fuzzy match window, and SHALL surface them for review rather than silently discarding them.

#### Scenario: Possible duplicate
- **WHEN** an imported row matches an existing transaction on account, date, amount, and counterparty
- **THEN** the system marks it as a possible duplicate for the user to resolve

### Requirement: Idempotency
The system SHALL prevent duplicate imports of the same file content using a file hash or an idempotency key, and SHALL record import history.

#### Scenario: Re-import same file
- **WHEN** the same file content is imported twice with the same key
- **THEN** the system does not create duplicate records

### Requirement: Brokerage import
The system SHALL import brokerage positions, lots, sales, and dividends from a brokerage CSV through the same staging and review flow.

#### Scenario: Brokerage rows
- **WHEN** a brokerage CSV is imported
- **THEN** valid positions, lots, sales, and dividends are staged and committed without affecting unrelated accounts
