# Insights

## Purpose

Surface deterministic, severity-ranked observations about the user's finances.

## Requirements

### Requirement: Deterministic insight generation
The system SHALL generate insights from deterministic rules and aggregations over the user's data and SHALL NOT require an LLM.

#### Scenario: Generate insights
- **WHEN** a user opens insights
- **THEN** the system returns a list of insights computed from the current data

### Requirement: Insight coverage
The system SHALL produce insights for savings rate, budget variance, category spending spikes, upcoming recurring bills, debt burden, investment allocation drift, net-worth trend, cash-flow risk, goal trajectory risk, idle cash, net-worth milestones, spending anomalies, and subscription audits.

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

### Requirement: Insight shape
Each insight SHALL include a stable type identifier, a severity (`info`, `warning`, or `critical`), supporting data, and an optional action that links to the relevant screen or report.

#### Scenario: Actionable insight
- **WHEN** an insight is displayed
- **THEN** the user can follow its action to the underlying data

### Requirement: Localizable output
The insight service SHALL return a type and structured data rather than user-facing prose, so the interface can render localized text.

#### Scenario: Localized insight
- **WHEN** insights are rendered in Portuguese or English
- **THEN** the text is produced from the insight type and data in the active locale

### Requirement: Acknowledgement
The system SHALL allow a user to acknowledge an insight and SHALL keep it hidden until the underlying condition changes.

#### Scenario: Acknowledge and resurface
- **WHEN** a user acknowledges an insight and the underlying condition later changes
- **THEN** the insight becomes visible again

### Requirement: Insufficient history
The system SHALL indicate when there is not enough data to compute an insight instead of producing a misleading result.

#### Scenario: Not enough history
- **WHEN** fewer than the required periods of data exist for a trend insight
- **THEN** the system reports that there is insufficient data for that insight
