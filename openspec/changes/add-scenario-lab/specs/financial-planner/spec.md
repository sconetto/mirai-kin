## MODIFIED Requirements

### Requirement: Scenarios
The system SHALL support saved, user-editable conservative, base, and optimistic scenarios with configurable expected return, inflation, monthly contribution, and horizon assumptions, and SHALL show their projected outcomes side by side.

#### Scenario: Scenario comparison
- **WHEN** the user compares scenarios for the plan
- **THEN** the system shows the projected outcome under each scenario with the assumptions used

#### Scenario: Default scenario
- **WHEN** a scenario is marked as default
- **THEN** the plan trajectory uses that scenario's assumptions

#### Scenario: Inherited values
- **WHEN** a scenario leaves an assumption unset
- **THEN** the value is inherited from the base plan and shown as inherited
