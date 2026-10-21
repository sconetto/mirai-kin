## ADDED Requirements

### Requirement: Scenario assumptions
The system SHALL store named plan scenarios with validated assumptions for expected nominal return, inflation, monthly contribution, and horizon.

#### Scenario: Create a scenario
- **WHEN** a user creates a scenario with a name and valid assumptions
- **THEN** the system stores it and includes it in comparisons

#### Scenario: Inherited assumption
- **WHEN** a scenario omits an assumption
- **THEN** the system inherits that value from the base plan

### Requirement: Scenario editing
The system SHALL allow a user to create, rename, edit, duplicate, and delete scenarios.

#### Scenario: Edit assumptions
- **WHEN** a user changes a scenario's return or contribution
- **THEN** subsequent comparisons use the new values

#### Scenario: Duplicate a scenario
- **WHEN** a user duplicates a scenario
- **THEN** the system creates an independent copy with a distinguishable name

### Requirement: Default scenario
The system SHALL maintain exactly one default scenario and SHALL use it for the plan trajectory.

#### Scenario: Set default
- **WHEN** a user sets a scenario as default
- **THEN** the previous default is cleared in the same transaction

#### Scenario: Delete default
- **WHEN** a user deletes the default scenario and another scenario exists
- **THEN** the system requires selecting a replacement default

#### Scenario: Delete last scenario
- **WHEN** a user deletes the only scenario
- **THEN** the system rejects the deletion

### Requirement: Seed scenarios
The system SHALL seed Base, Optimistic, and Pessimistic scenarios when no scenarios exist.

#### Scenario: Initial scenario list
- **WHEN** the user opens the scenario lab with no saved scenarios
- **THEN** the system seeds the three scenarios and marks Base as default

### Requirement: Scenario comparison
The system SHALL compare the base plan and saved scenarios side by side using deterministic trajectory math.

#### Scenario: Compare scenarios
- **WHEN** the user compares scenarios
- **THEN** the system shows projected net worth, monthly contribution, horizon, and return for each scenario

#### Scenario: Reproducible comparison
- **WHEN** the same scenarios and as-of date are compared twice
- **THEN** the resulting figures are identical

### Requirement: Scenario validation
The system SHALL validate expected return, inflation, monthly contribution, horizon, and name, and SHALL reject invalid values with a field-level error.

#### Scenario: Invalid horizon
- **WHEN** a scenario horizon is outside the supported range
- **THEN** the system rejects the scenario and reports the horizon field

### Requirement: Scenario API
The system SHALL expose authenticated scenario listing, creation, update, deletion, and comparison through the versioned REST API.

#### Scenario: Create via API
- **WHEN** an authenticated client creates a valid scenario
- **THEN** the system returns the stored scenario
