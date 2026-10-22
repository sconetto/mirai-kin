## MODIFIED Requirements

### Requirement: Goals
The system SHALL manage goals with pledges and withdrawal detection in addition to their kind, target, funding, and trajectory.

#### Scenario: Goal with pledge
- **WHEN** a goal has an open pledge
- **THEN** the planner shows the pledge and includes it in the goal's funding outlook

#### Scenario: Goal with withdrawal
- **WHEN** a goal has a detected withdrawal
- **THEN** the planner surfaces a withdrawal warning on that goal
