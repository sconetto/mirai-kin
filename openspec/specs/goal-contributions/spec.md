# Goal Contributions

## Purpose

Detect intentional contributions to account-funded goals from transfer activity.

## Requirements

### Requirement: Tracked contribution detection
The system SHALL treat a transfer as a tracked goal contribution when its destination account belongs to the goal's allocations, its source account does not belong to those allocations, and its date falls inside the requested period.

#### Scenario: Contribution from outside the goal
- **WHEN** a transfer moves money from a checking account into an account allocated to a goal
- **THEN** the destination amount is counted as a tracked contribution to that goal

#### Scenario: Internal reallocation
- **WHEN** a transfer moves money between two accounts that both belong to the same goal
- **THEN** the transfer is not counted as a contribution

#### Scenario: Transfer to another goal
- **WHEN** a transfer moves money into an account that belongs to a different goal
- **THEN** it is counted for that destination goal, not the source goal

### Requirement: Base-currency contribution amount
The system SHALL convert tracked contributions to the base currency using the transfer-date exchange rate.

#### Scenario: Cross-currency contribution
- **WHEN** a transfer contributes a foreign-currency amount into a base-currency goal account
- **THEN** the reported contribution uses the base-currency destination amount

### Requirement: Manual goals
The system SHALL NOT infer tracked contributions for manually funded goals because they have no account allocations.

#### Scenario: Manual goal
- **WHEN** a goal uses manual funding
- **THEN** tracked contributions are reported as unavailable and the dashboard may use its documented fallback

### Requirement: Contribution period
The system SHALL limit tracked contributions to transfers dated within the selected reporting period.

#### Scenario: Outside the period
- **WHEN** a transfer falls before the selected period
- **THEN** it does not contribute to the period total
