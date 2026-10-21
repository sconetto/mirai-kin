# Accounts

## Purpose

Manage the accounts that hold money, debts, and assets, with per-account currencies and computed balances.

## Requirements

### Requirement: Account lifecycle
The system SHALL allow creating, reading, updating, and archiving accounts, each with a name, type, currency, and opening balance.

#### Scenario: Create account
- **WHEN** a user creates an account with a name, type, currency, and opening balance
- **THEN** the system stores the account and returns it with a generated id

#### Scenario: Archive account
- **WHEN** a user archives an account
- **THEN** the account is hidden from default listings but its transactions remain queryable

### Requirement: Account types
The system SHALL support a fixed set of account types including checking, savings, credit card, investment, loan, mortgage, asset, and cash.

#### Scenario: Invalid type rejected
- **WHEN** an account is created with an unsupported type
- **THEN** the system rejects the request with a validation error

### Requirement: Multi-currency accounts
The system SHALL store each account's currency as an ISO 4217 code and SHALL permit multiple accounts in different currencies.

#### Scenario: Mixed-currency accounts
- **WHEN** accounts exist in BRL, EUR, and USD
- **THEN** the system lists them independently and preserves each account's own currency

### Requirement: Computed balances
The system SHALL compute each account's current balance as its opening balance plus the sum of its transactions, in the account's currency.

#### Scenario: Balance reflects transactions
- **WHEN** an account has an opening balance and recorded transactions
- **THEN** the reported balance equals the opening balance plus the net of all transactions
