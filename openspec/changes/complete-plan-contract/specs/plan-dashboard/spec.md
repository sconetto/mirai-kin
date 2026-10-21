## MODIFIED Requirements

### Requirement: Net-worth movement
The overview SHALL explain the change in net worth since the previous checkpoint by decomposing income, spending, market movement, FX effects, and a separate debt-service memo that does not subtract principal already reflected in net worth.

#### Scenario: Movement available
- **WHEN** two comparable snapshots and the required flow data exist
- **THEN** the overview shows a movement bridge whose income, spending, market, and FX components reconcile to the closing net worth

#### Scenario: FX separation
- **WHEN** the opening snapshot contains native values for foreign-currency components
- **THEN** the bridge reports the FX effect separately from market movement

#### Scenario: FX fallback
- **WHEN** the opening snapshot lacks native values
- **THEN** the bridge combines FX with market movement and labels the residual

#### Scenario: Debt service memo
- **WHEN** scheduled debt payments fall inside the movement period
- **THEN** the overview shows them as a separate memo without subtracting them from the net-worth equation

#### Scenario: Movement unavailable
- **WHEN** the required history is incomplete
- **THEN** the overview hides or replaces the bridge with an explanation

### Requirement: Contribution pace
The overview SHALL compare actual plan contributions with the pace required by the plan over the selected range, and SHALL identify whether actual contributions came from tracked transfers or the documented net-savings fallback.

#### Scenario: Behind pace
- **WHEN** actual contributions are below the required pace
- **THEN** the overview shows the shortfall and the period over which it accumulated

#### Scenario: Ahead of pace
- **WHEN** actual contributions meet or exceed the required pace
- **THEN** the overview shows the surplus without treating it as investment return

#### Scenario: Tracked contributions available
- **WHEN** transfers into goal-funded accounts exist in the period
- **THEN** the pace uses those tracked contributions and labels the source

#### Scenario: Fallback
- **WHEN** no tracked contributions exist for manual goals
- **THEN** the pace uses net savings and labels it as the fallback
