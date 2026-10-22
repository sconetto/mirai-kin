# Financial Planner

## Purpose

Track goals, scenarios, required contributions, and emergency runway.

## Requirements

### Requirement: Goals
The system SHALL manage financial goals with one of four kinds — savings, purchase, debt payoff, or income — with a target amount, optional target date, currency, priority, notes, a funding mode where applicable, planned monthly amount, expected nominal return, inflation assumption, down-payment percentage for purchases, and interest rate for debt. Goals SHALL also support dated pledges and withdrawal detection for goal-linked accounts.

#### Scenario: Create a savings goal
- **WHEN** a user creates a savings goal with a target amount, target date, funding source, monthly contribution, return, and inflation
- **THEN** the system stores it and reports its projected savings and status

#### Scenario: Create a purchase goal
- **WHEN** a user creates a purchase goal with a purchase price, down-payment percentage, saved amount, monthly contribution, return, and inflation
- **THEN** the system reports the down-payment cash target, projected savings, financed amount, and status

#### Scenario: Create a debt payoff goal
- **WHEN** a user creates a debt payoff goal with a balance, amount paid, monthly payment, interest rate, and target date
- **THEN** the system reports the projected remaining balance, required payment, and payoff status

#### Scenario: Create an income goal
- **WHEN** a user creates an income goal with current monthly income, target monthly income, additional monthly income, growth, and target date
- **THEN** the system reports the projected monthly income, required income increase, and status

#### Scenario: Create a goal without a deadline
- **WHEN** a user creates a goal without a target date
- **THEN** the system stores it and reports that trajectory status is unavailable until a date is supplied

#### Scenario: Update assumptions
- **WHEN** a user changes a goal's kind, amount, contribution, return, inflation, down payment, interest rate, or funding source
- **THEN** the system recalculates its trajectory using the new assumptions

#### Scenario: Goal with pledge
- **WHEN** a goal has an open pledge
- **THEN** the planner shows the pledge and includes it in the goal's funding outlook

#### Scenario: Goal with withdrawal
- **WHEN** a goal has a detected withdrawal
- **THEN** the planner surfaces a withdrawal warning on that goal

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

### Requirement: Emergency-fund runway
The system SHALL compute the emergency-fund runway in months of essential expenses.

#### Scenario: Runway
- **WHEN** essential-expense and liquid-asset data exist
- **THEN** the system reports the number of months covered

### Requirement: Deterministic projections
The planner SHALL use deterministic projections from the existing forecast engine; stochastic modeling is out of scope for this revision.

#### Scenario: Reproducible output
- **WHEN** a projection is generated
- **THEN** the figures are reproducible from the configured assumptions
