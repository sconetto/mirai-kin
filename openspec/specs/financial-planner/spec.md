# Financial Planner

## Purpose

Track goals, scenarios, required contributions, and emergency runway.

## Requirements

### Requirement: Goals
The system SHALL manage financial goals (emergency fund, retirement, home, custom) with a target amount, target date, currency, priority, linked accounts, and notes.

#### Scenario: Create a goal
- **WHEN** a user creates a goal with a target amount and date
- **THEN** the system stores it and shows progress toward the target

### Requirement: Scenarios
The system SHALL support base, optimistic, and pessimistic scenarios with configurable assumptions for income growth, inflation, return rate, savings rate, and horizon.

#### Scenario: Scenario comparison
- **WHEN** the user compares scenarios
- **THEN** the system shows projected outcomes side by side

### Requirement: Required contribution
The system SHALL compute the periodic contribution required to reach a goal by its target date under the assumed return.

#### Scenario: Required monthly contribution
- **WHEN** a goal has a target date and amount
- **THEN** the system reports the monthly contribution needed

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
