# Transfers

## Purpose

Represent movements between accounts as paired legs, with cross-currency support, manual pairing, and transfer-aware reporting.

## Requirements

### Requirement: Transfer pairs
The system SHALL represent a transfer as a pair of transaction legs that share a transfer id, with a source account, destination account, amount, currency, and date.

#### Scenario: Pair two legs
- **WHEN** two transaction legs are paired as a transfer
- **THEN** both legs reference the same transfer id and the transfer is reported as paired

### Requirement: Cross-currency transfers
The system SHALL support transfers between accounts in different currencies and SHALL store the source amount, the counter amount, and the applied exchange rate.

#### Scenario: EUR to BRL
- **WHEN** a transfer moves funds from a EUR account to a BRL account
- **THEN** the system stores the EUR amount, the BRL counter amount, and the rate used

### Requirement: Manual pairing and unpairing
The system SHALL allow a user to pair two transactions manually and to unpair an existing transfer, returning both legs to regular transactions.

#### Scenario: Manual pair
- **WHEN** a user pairs two matching transactions
- **THEN** the system creates a transfer and links both legs

#### Scenario: Unpair
- **WHEN** a user unpairs a transfer
- **THEN** both legs become regular transactions and the transfer is removed

### Requirement: Import pairing and backfill
The system SHALL attempt to pair transfer legs during import and SHALL backfill existing records tagged as transfers, leaving ambiguous matches unpaired for review.

#### Scenario: Automatic pairing
- **WHEN** an imported out leg and in leg match on amount, date window, and accounts
- **THEN** the system pairs them automatically

#### Scenario: Ambiguous match
- **WHEN** more than one plausible counterpart exists
- **THEN** the system leaves the leg unpaired and flags it in data quality

### Requirement: Transfer-aware reporting
The system SHALL exclude transfer legs from income and expense reports and SHALL count each transfer pair once in the transfers report.

#### Scenario: Transfers excluded from cash flow
- **WHEN** a cash-flow report is generated
- **THEN** transfer legs do not contribute to income or expenses

#### Scenario: Pair counted once
- **WHEN** a transfers report is generated
- **THEN** each paired transfer contributes its amount once, not once per leg

### Requirement: Transfer API
The system SHALL expose transfer creation, pairing, and unpairing through the versioned REST API.

#### Scenario: Create via API
- **WHEN** a client creates a transfer with source and destination accounts
- **THEN** the system stores the transfer and its two legs and returns the transfer id
