# Tax

## ADDED Requirements

### Requirement: Brazil-first tax summaries
The system SHALL produce Brazil-first tax-relevant summaries for a selected tax year: income by category, deductible expenses, capital gains, and dividends.

#### Scenario: Income summary
- **WHEN** the user selects a tax year
- **THEN** the system summarizes income by category in the base currency

### Requirement: Deductible classification
The system SHALL allow categories and transactions to be classified as tax-deductible and SHALL summarize deductible expenses.

#### Scenario: Deductible expenses
- **WHEN** transactions are marked deductible
- **THEN** the tax summary lists them by category and reports the total

### Requirement: Capital gains
The system SHALL summarize realized capital gains and losses from brokerage data for the selected year.

#### Scenario: Capital gains
- **WHEN** brokerage sales exist for the tax year
- **THEN** the tax summary reports realized gains and losses

### Requirement: Dividends
The system SHALL summarize dividends received during the tax year.

#### Scenario: Dividends
- **WHEN** dividends were recorded in the tax year
- **THEN** the tax summary lists them by position and total

### Requirement: Exports
The system SHALL export tax summaries to CSV.

#### Scenario: Tax export
- **WHEN** the user exports a tax summary
- **THEN** a CSV containing the summary rows is downloaded

### Requirement: No tax calculation or filing
The system SHALL NOT compute final tax liability or file tax returns, and SHALL display a clear disclaimer.

#### Scenario: Disclaimer
- **WHEN** the user opens the tax area
- **THEN** a notice states that the app does not calculate or file taxes and is not tax advice
