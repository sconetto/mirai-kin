## MODIFIED Requirements

### Requirement: Cash-flow and spending analysis
The overview SHALL show a monthly cash-flow breakdown from income sources through a central hub to top-level spending categories, their child categories, and surplus or savings draw, SHALL expose subcategory detail for spending in the graph and the outflows view, and SHALL compare cumulative spending for the selected month with the previous month.

#### Scenario: Cash-flow breakdown
- **WHEN** a month has income and spending transactions
- **THEN** the overview shows income sources flowing through the hub to parent spending categories, their child categories, and a surplus or savings draw

#### Scenario: Parent and child category flows
- **WHEN** an expense parent category has child categories
- **THEN** the graph shows the parent's aggregated total and separate child flows whose amounts sum to the parent total

#### Scenario: Direct parent spending
- **WHEN** an expense parent has spending assigned directly to the parent in addition to child categories
- **THEN** the graph shows a direct-spending child for the residual so the parent inflow and child outflows reconcile

#### Scenario: Leaf parent category
- **WHEN** an expense parent has no child categories
- **THEN** the graph keeps it as a leaf in the parent stage without inventing children

#### Scenario: Spending comparison
- **WHEN** a month is selected
- **THEN** the overview compares its cumulative spending with the same period in the previous month

#### Scenario: Month navigation
- **WHEN** a user moves to a previous or next month
- **THEN** the cash-flow, outflows, and spending comparison views use that month

#### Scenario: Small outflow categories
- **WHEN** a spending category falls below 3% of monthly outflows
- **THEN** the overview groups it into Other while keeping the category detail available

#### Scenario: Wallet group parents
- **WHEN** imported Wallet categories belong to a Wallet group
- **THEN** the overview shows the group as the parent category and its Wallet categories as child detail in the graph and the outflows view
