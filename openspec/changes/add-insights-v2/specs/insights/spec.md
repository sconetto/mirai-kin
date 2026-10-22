## MODIFIED Requirements

### Requirement: Insight coverage
The system SHALL produce insights for savings rate, budget variance, category spending spikes, upcoming recurring bills, debt burden, investment allocation drift, net-worth trend, cash-flow risk, goal trajectory risk, idle cash, net-worth milestones, spending anomalies, and subscription audits.

#### Scenario: Idle cash
- **WHEN** liquid cash exceeds the configured months-of-expenses threshold
- **THEN** the system produces an idle-cash insight with the excess amount and a link to accounts

#### Scenario: Net-worth milestone
- **WHEN** net worth crosses a configured round milestone
- **THEN** the system produces a milestone insight with the value reached

#### Scenario: Spending anomaly
- **WHEN** a period's spend deviates from its trailing mean by more than the configured multiple of standard deviation
- **THEN** the system produces a spending-anomaly insight for that period

#### Scenario: Subscription audit
- **WHEN** subscriptions data exists
- **THEN** the system produces a summary insight listing recurring subscription amounts and any likely duplicates
