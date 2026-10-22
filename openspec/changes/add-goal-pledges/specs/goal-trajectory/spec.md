## ADDED Requirements

### Requirement: Goal pledges
The system SHALL store a dated pledge to contribute an amount to a goal by a due date, with an open, fulfilled, or expired status.

#### Scenario: Open pledge
- **WHEN** a pledge is created with a future due date
- **THEN** it is open and included in the goal's projected funding until its due date

#### Scenario: Expired pledge
- **WHEN** a pledge's due date passes without being fulfilled
- **THEN** it is marked expired and excluded from projection

### Requirement: Withdrawal detection
The system SHALL flag a withdrawal from a goal when money moves out of a goal-linked account to an account outside the goal.

#### Scenario: Withdrawal flagged
- **WHEN** a transfer leaves a goal-linked account for an outside account
- **THEN** the goal shows a withdrawal warning with the amount

#### Scenario: Internal reallocation ignored
- **WHEN** a transfer moves between two accounts that both fund the same goal
- **THEN** it is not flagged as a withdrawal
