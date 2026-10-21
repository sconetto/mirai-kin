## MODIFIED Requirements

### Requirement: Insight coverage

The system SHALL produce insights for savings rate, budget variance, category spending spikes, upcoming recurring bills, debt burden, investment allocation drift, net-worth trend, cash-flow risk, and goal trajectory risk.

#### Scenario: Budget overrun

- **WHEN** a budget's spend exceeds its limit
- **THEN** the system produces an insight with the surplus amount and a link to the budget

#### Scenario: Category spike

- **WHEN** a category's current-period spend exceeds its trailing average by the configured threshold
- **THEN** the system produces a spending-spike insight for that category

#### Scenario: Goal at risk

- **WHEN** a goal's conservative projection misses its target but its base projection meets it
- **THEN** the system produces a goal-at-risk insight with the goal, gap, and required contribution

#### Scenario: Goal off track

- **WHEN** a goal's base projection misses its target
- **THEN** the system produces a goal-off-track insight with the goal, gap, and required contribution
