## MODIFIED Requirements

### Requirement: Trajectory chart
The overview SHALL chart actual net-worth history together with conservative, base, and optimistic projections using a padded y-axis, SHALL mark today, and SHALL show goal targets in a separate goal rail rather than as points on the net-worth axis.

#### Scenario: On-track trajectory
- **WHEN** a plan has history, projections, and a target date
- **THEN** the chart shows the actual line, the projection band, and a clear today marker

#### Scenario: Assumptions visible
- **WHEN** a projection is displayed
- **THEN** the effective return, inflation, contribution, horizon, and per-class growth rates are available without leaving the overview

#### Scenario: No history
- **WHEN** fewer than two net-worth snapshots exist
- **THEN** the chart shows the current value and a history-building state rather than inventing a trend

#### Scenario: Padded axis
- **WHEN** the chart is rendered
- **THEN** the y-axis is padded around actual and projected net worth instead of starting at zero or extending to a low goal target

#### Scenario: Goal rail
- **WHEN** goals have target dates and amounts
- **THEN** they are listed in a separate rail with name, target date, target amount, and status

### Requirement: Composition
The overview SHALL show net-worth composition by asset class — cash/savings, financial investments, real estate, vehicles, other assets, and liabilities — and SHALL keep monthly spending categories on the spending surface.

#### Scenario: Composition available
- **WHEN** net-worth components exist
- **THEN** the overview shows cash, financial investments, real estate, vehicles, other assets, and liabilities in base currency

#### Scenario: Vehicles and real estate separated
- **WHEN** the portfolio contains vehicle or real-estate assets
- **THEN** they are shown in their own composition buckets instead of being merged into investments

#### Scenario: Spending categories
- **WHEN** a user wants category-level spending detail
- **THEN** the overview links to the spending surface rather than duplicating the category donut
