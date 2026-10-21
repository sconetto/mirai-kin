## MODIFIED Requirements

### Requirement: Long-horizon net-worth trajectory
The system SHALL project net worth over a configurable multi-year horizon using starting net worth, planned goal contributions, expected nominal return, and inflation, while retaining the existing short-term cash-flow forecast. The projection SHALL NOT subtract scheduled debt principal because liabilities are already reflected in net worth, and SHALL expose scheduled debt service separately as a memo.

#### Scenario: Ten-year trajectory
- **WHEN** a trajectory is requested for a ten-year horizon
- **THEN** the system returns a dated series derived from net worth, contributions, returns, and inflation

#### Scenario: No goals
- **WHEN** no goal contributions exist
- **THEN** the trajectory still projects net worth from the configured return and inflation assumptions

#### Scenario: Debt treatment
- **WHEN** scheduled debt payments exist
- **THEN** the trajectory reports them as debt service without subtracting principal from projected net worth

### Requirement: Trajectory assumptions
The system SHALL apply conservative, base, and optimistic assumptions to the net-worth trajectory and SHALL return the return, inflation, contribution, and horizon assumptions with the result.

#### Scenario: Assumption transparency
- **WHEN** a trajectory response is produced
- **THEN** it includes the return, inflation, contribution, and horizon used for each scenario
