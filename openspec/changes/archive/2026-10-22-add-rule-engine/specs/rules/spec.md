## ADDED Requirements

### Requirement: Typed conditions and actions
The system SHALL express rule conditions and actions as typed entries resolved through registries, supporting multiple condition kinds and action kinds.

#### Scenario: Categorize with a note condition
- **WHEN** a rule has a "note contains X" condition and a "set category" action
- **THEN** matching transactions are recategorized when the rule runs

#### Scenario: Multiple actions
- **WHEN** a rule defines more than one action
- **THEN** each action applies to a matching transaction

### Requirement: Safe text matching
The system SHALL support contains matching and a bounded regular-expression operator that cannot hang matching.

#### Scenario: Bounded regex
- **WHEN** a rule uses a regular expression
- **THEN** matching completes within a bounded time

### Requirement: Rule run history
The system SHALL record each rule execution with its timestamp and match count.

#### Scenario: Record a run
- **WHEN** a rule runs
- **THEN** a run entry is created with the number of matches

### Requirement: Preview and confirm
The system SHALL show the transactions a rule would match before applying it.

#### Scenario: Preview before apply
- **WHEN** a user previews a rule
- **THEN** the system lists the matched transactions and requires confirmation before applying changes
