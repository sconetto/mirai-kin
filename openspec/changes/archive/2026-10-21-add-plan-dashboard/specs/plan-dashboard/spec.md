## ADDED Requirements

### Requirement: Plan-first overview

The overview SHALL lead with overall plan status, the next relevant action, and the goal list before showing tactical spending or account detail.

#### Scenario: Plan exists

- **WHEN** a user opens the overview with configured goals
- **THEN** the first content region shows the plan verdict and per-goal statuses

#### Scenario: No goals

- **WHEN** no goals exist
- **THEN** the overview shows a plan-creation invitation instead of an empty chart grid

### Requirement: Time-range selection

The overview SHALL provide `1M`, `6M`, `1Y`, `All`, and `Plan` ranges, SHALL persist the selected range in the URL, and SHALL apply it to the trajectory and movement views.

#### Scenario: Change range

- **WHEN** a user selects `1Y`
- **THEN** the URL reflects the range and the history, movement, and contribution views update accordingly

#### Scenario: Default range

- **WHEN** no range is present in the URL
- **THEN** the overview uses a documented default range

### Requirement: Trajectory chart

The overview SHALL chart actual net-worth history together with conservative, base, and optimistic projections, and SHALL mark goal target dates and values.

#### Scenario: On-track trajectory

- **WHEN** a plan has history, projections, and a target date
- **THEN** the chart shows the actual line, the projection band, and the target marker

#### Scenario: Assumptions visible

- **WHEN** a projection is displayed
- **THEN** the assumptions that produced it are available without leaving the overview

#### Scenario: No history

- **WHEN** fewer than two net-worth snapshots exist
- **THEN** the chart shows the current value and a history-building state rather than inventing a trend

### Requirement: Goal status list

The overview SHALL show each goal's name, target date, status, projected value, funding gap, and required monthly contribution, with a link to the planner.

#### Scenario: Goal at risk

- **WHEN** a goal is at risk
- **THEN** its row shows the status label, gap, and required contribution

#### Scenario: Goal missing assumptions

- **WHEN** a goal lacks funding assumptions or a target date
- **THEN** its row explains what is missing and links to the planner instead of showing a fabricated percentage

### Requirement: Net-worth movement

The overview SHALL explain the change in net worth since the previous checkpoint by decomposing contributions, market movement, spending, debt payments, and FX effects.

#### Scenario: Movement available

- **WHEN** two comparable snapshots and the required flow data exist
- **THEN** the overview shows a movement bridge whose components reconcile to the closing net worth

#### Scenario: Movement unavailable

- **WHEN** the required history is incomplete
- **THEN** the overview hides or replaces the bridge with an explanation

### Requirement: Contribution pace

The overview SHALL compare actual plan contributions with the pace required by the plan over the selected range.

#### Scenario: Behind pace

- **WHEN** actual contributions are below the required pace
- **THEN** the overview shows the shortfall and the period over which it accumulated

#### Scenario: Ahead of pace

- **WHEN** actual contributions meet or exceed the required pace
- **THEN** the overview shows the surplus without treating it as investment return

### Requirement: Composition

The overview SHALL show net-worth composition by asset and liability class, and SHALL keep monthly spending categories on the spending surface.

#### Scenario: Composition available

- **WHEN** net-worth components exist
- **THEN** the overview shows cash, investments, property/assets, and liabilities in base currency

#### Scenario: Spending categories

- **WHEN** a user wants category-level spending detail
- **THEN** the overview links to the spending surface rather than duplicating the category donut

### Requirement: Tactical insight separation

The overview SHALL show only plan-relevant explanations; category-spike, budget-variance, and monthly savings-rate alerts SHALL remain available on the spending surface.

#### Scenario: Category spike occurs

- **WHEN** a category spike is detected
- **THEN** it does not displace the plan verdict on the overview

### Requirement: Partial and insufficient data

The overview SHALL distinguish missing goals, missing plan assumptions, missing history, and missing movement data, and SHALL NOT present a positive plan verdict when required inputs are absent.

#### Scenario: Insufficient plan data

- **WHEN** the plan-status service reports insufficient data for a goal
- **THEN** the overview labels the goal as needing setup rather than on track

### Requirement: Responsive and accessible presentation

The overview SHALL adapt chart density to the viewport and SHALL provide text alternatives so status and trends do not depend on color alone.

#### Scenario: Mobile view

- **WHEN** the overview is viewed on a phone
- **THEN** plan status and goal cards remain readable and dense charts use compact representations

#### Scenario: Assistive technology

- **WHEN** a chart is rendered
- **THEN** its status, trend, and key values are available in an accessible summary
