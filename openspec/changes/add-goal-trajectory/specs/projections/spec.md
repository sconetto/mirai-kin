## ADDED Requirements

### Requirement: Long-horizon net-worth trajectory

The system SHALL project net worth over a configurable multi-year horizon using starting net worth, planned goal contributions, expected nominal return, inflation, and scheduled debt payments, while retaining the existing short-term cash-flow forecast.

#### Scenario: Ten-year trajectory

- **WHEN** a trajectory is requested for a ten-year horizon
- **THEN** the system returns a dated series derived from net worth, contributions, returns, inflation, and debt payments

#### Scenario: No goals

- **WHEN** no goal contributions exist
- **THEN** the trajectory still projects net worth from the configured return, inflation, and debt assumptions

### Requirement: Trajectory assumptions

The system SHALL apply the conservative, base, and optimistic assumptions to the net-worth trajectory and SHALL return the assumptions with the result.

#### Scenario: Assumption transparency

- **WHEN** a trajectory response is produced
- **THEN** it includes the return, inflation, contribution, and horizon used for each scenario

### Requirement: Deterministic trajectory

The system SHALL produce identical trajectory figures when run twice with identical inputs and assumptions.

#### Scenario: Reproducible trajectory

- **WHEN** the same plan is projected twice without changing data or assumptions
- **THEN** the resulting series are identical
