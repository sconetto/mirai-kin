## MODIFIED Requirements

### Requirement: Goals

The system SHALL manage financial goals (emergency fund, retirement, home, custom) with a target amount, optional target date, currency, priority, notes, a funding mode (linked account allocations or manual amount), planned monthly contribution, expected nominal return, and inflation assumption.

#### Scenario: Create a funded goal

- **WHEN** a user creates a goal with a target amount, target date, funding source, monthly contribution, return, and inflation
- **THEN** the system stores it and reports its trajectory status and progress

#### Scenario: Create a goal without a deadline

- **WHEN** a user creates a goal without a target date
- **THEN** the system stores it and reports that trajectory status is unavailable until a date is supplied

#### Scenario: Update funding assumptions

- **WHEN** a user changes a goal's contribution, return, inflation, or funding source
- **THEN** the system recalculates its trajectory using the new assumptions

### Requirement: Scenarios

The system SHALL support conservative, base, and optimistic plan scenarios with configurable expected return, inflation, contribution, and horizon assumptions, and SHALL show their projected outcomes side by side.

#### Scenario: Scenario comparison

- **WHEN** the user compares scenarios for a goal or the overall plan
- **THEN** the system shows the projected outcome under each scenario with the assumptions used

#### Scenario: Conservative outcome

- **WHEN** the conservative return assumption is selected
- **THEN** the projected value uses the lower return and the same contribution and inflation assumptions as the base case

### Requirement: Required contribution

The system SHALL compute the monthly contribution required to reach a goal by its target date using the funded amount, real return, and target amount, and SHALL return zero when the goal is already projected to meet its target.

#### Scenario: Required monthly contribution

- **WHEN** a goal has a target date, target amount, funded amount, and return assumption
- **THEN** the system reports the monthly contribution needed to reach the target

#### Scenario: Missing target date

- **WHEN** a goal has no target date
- **THEN** the system does not report a required monthly contribution

#### Scenario: Already on track

- **WHEN** the current funded amount and planned contributions are projected to meet the target
- **THEN** the required contribution is zero
