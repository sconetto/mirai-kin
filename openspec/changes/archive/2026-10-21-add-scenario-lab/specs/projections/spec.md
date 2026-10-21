## MODIFIED Requirements

### Requirement: Trajectory assumptions
The system SHALL apply conservative, base, and optimistic assumptions to the net-worth trajectory, SHALL allow the selected scenario to override return, inflation, contribution, and horizon, and SHALL return the effective assumptions with the result.

#### Scenario: Assumption transparency
- **WHEN** a trajectory response is produced
- **THEN** it includes the effective return, inflation, contribution, and horizon used for each scenario

#### Scenario: Scenario override
- **WHEN** a saved scenario is selected for the trajectory
- **THEN** the projection uses the scenario's overrides and inherits unset values from the base plan

#### Scenario: No scenario selected
- **WHEN** no scenario is selected
- **THEN** the projection uses the base plan assumptions
