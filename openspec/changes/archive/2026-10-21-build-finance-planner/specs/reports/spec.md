# Reports

## ADDED Requirements

### Requirement: Report suite
The system SHALL provide reports for cash flow, income, expenses, transfers, spending by category, budget versus actual, net worth, debt, and investment performance.

#### Scenario: Cash-flow report
- **WHEN** a user opens the cash-flow report for a date range
- **THEN** the system shows income, expenses, transfers, net cash flow, and a period breakdown

#### Scenario: Spending-by-category report
- **WHEN** a user opens the spending-by-category report
- **THEN** the system shows the total per category, ordered from largest to smallest

### Requirement: Date ranges and filters
The system SHALL support preset date ranges (this month, last month, this quarter, this year, custom) and SHALL allow filtering reports by accounts, categories, labels, and currency.

#### Scenario: Custom range
- **WHEN** a user selects a custom start and end date
- **THEN** every figure in the report is recomputed for that range

#### Scenario: Scoped report
- **WHEN** a user filters a report to a set of accounts or categories
- **THEN** only matching transactions contribute to the report

### Requirement: Summary and period table
The system SHALL return summary totals (income, expenses, net, average per period) alongside a period-by-period table.

#### Scenario: Monthly table
- **WHEN** a monthly report is generated
- **THEN** the table lists each month with income, expenses, and net figures

### Requirement: Saved reports
The system SHALL allow saving a report configuration (type, range, filters, grouping, chart type) under a name, and SHALL support listing, reopening, renaming, and deleting saved reports.

#### Scenario: Save and reopen a report
- **WHEN** a user saves a configured report under a name and later reopens it
- **THEN** the report is restored with the same configuration

### Requirement: Report export
The system SHALL export any report to CSV.

#### Scenario: CSV export
- **WHEN** a user exports a report
- **THEN** the system downloads a CSV containing the report headers and rows

### Requirement: Period comparison
The system SHALL compare a report period against the previous period and against the same period in the prior year.

#### Scenario: Month-over-month
- **WHEN** a user enables comparison
- **THEN** the report shows the absolute and percentage change versus the baseline period
