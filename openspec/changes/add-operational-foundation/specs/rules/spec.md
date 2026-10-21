# Rules

## ADDED Requirements

### Requirement: Rule definition
The system SHALL allow creating deterministic rules with conditions (counterparty, note, amount range, account, payment type, category) and actions (category, labels, mark reviewed, deductible).

#### Scenario: Create a rule
- **WHEN** a user creates an enabled rule with a counterparty condition and a category action
- **THEN** the system stores the rule with its priority

### Requirement: Apply on import
The system SHALL evaluate enabled rules during import staging and SHALL show the proposed category and actions before commit.

#### Scenario: Rule matches an imported row
- **WHEN** an imported row matches a rule
- **THEN** the review screen shows the rule's proposed category and actions

### Requirement: Apply to existing records
The system SHALL allow a user to preview and then apply rules to existing transactions.

#### Scenario: Preview and apply
- **WHEN** a user previews a rule over a filtered set
- **THEN** the system reports the match count and applies the actions only after confirmation

### Requirement: Precedence and traceability
The system SHALL evaluate rules by priority, SHALL apply the first matching rule's category, and SHALL record which rule was applied to a transaction.

#### Scenario: Priority order
- **WHEN** two rules match a transaction
- **THEN** the higher-priority rule determines the category and the applied rule id is stored

### Requirement: Rule testing
The system SHALL allow testing a rule against existing data without writing changes.

#### Scenario: Test a rule
- **WHEN** a user tests a rule
- **THEN** the system returns the matching records without modifying them

### Requirement: Recurring detection status
The system SHALL persist detected recurring bills with a status of detected, confirmed, or ignored.

#### Scenario: Confirm a detection
- **WHEN** a user confirms a detected bill
- **THEN** the system links it to a recurring transaction and the bill no longer appears as a suggestion

#### Scenario: Ignore a detection
- **WHEN** a user ignores a detected bill
- **THEN** the system hides it from suggestions and upcoming bills

### Requirement: Recurring management
The system SHALL allow editing a confirmed recurring bill's amount, cadence, or next date.

#### Scenario: Edit a bill
- **WHEN** a user changes a confirmed bill's next date
- **THEN** the system uses the new date in upcoming bills and projections
