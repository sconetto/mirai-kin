# Brokerage

## Purpose

Track brokerage positions, cost basis, allocation, dividends, and realized gains.

## Requirements

### Requirement: Brokerage positions and lots
The system SHALL manage brokerage positions with symbol, quantity, cost basis, currency, and acquisition lots.

#### Scenario: Position with lots
- **WHEN** a user imports or creates a position with multiple acquisition lots
- **THEN** the system stores each lot and computes the aggregate cost basis

### Requirement: Cost-basis method
The system SHALL compute cost basis using the average-cost method by default and SHALL keep the method explicit in the position data.

#### Scenario: Average cost
- **WHEN** multiple lots exist for a position
- **THEN** the reported cost basis is the quantity-weighted average cost

### Requirement: Realized and unrealized gains
The system SHALL compute unrealized gains from the latest price and realized gains from sales against cost basis.

#### Scenario: Unrealized gain
- **WHEN** a latest price is available
- **THEN** the system reports the unrealized gain/loss and percentage

#### Scenario: Realized gain
- **WHEN** a sale is recorded
- **THEN** the system reports the realized gain/loss for that sale

### Requirement: Allocation
The system SHALL report allocation by instrument, currency, and account.

#### Scenario: Allocation view
- **WHEN** the user opens allocation
- **THEN** the system shows the share of each instrument, currency, and account in the portfolio

### Requirement: Dividends
The system SHALL record dividends by position and date and SHALL include them in income and tax reporting.

#### Scenario: Dividend recorded
- **WHEN** a dividend is recorded
- **THEN** it appears in the brokerage income and cash-flow report

### Requirement: Import and manual entry
The system SHALL import positions, lots, sales, and dividends from a brokerage CSV and SHALL allow manual entry.

#### Scenario: Brokerage CSV import
- **WHEN** a user imports a brokerage CSV
- **THEN** the system stages the rows, reports per-row errors, and commits valid records after review

### Requirement: Tax export
The system SHALL export brokerage positions, gains, and dividends for tax reporting.

#### Scenario: Brokerage export
- **WHEN** the user exports brokerage data for a tax year
- **THEN** the system produces a CSV with the relevant figures
