# Goal Trajectory

## Purpose

Model goal funding and compute deterministic, inflation-aware trajectories and statuses.

## Requirements

### Requirement: Goal funding model
The system SHALL store a funding model for every goal using either linked account allocations or a manual funded amount, together with a planned monthly contribution, expected nominal return, inflation assumption, target amount, and optional target date.

#### Scenario: Create an account-funded goal
- **WHEN** a user creates a goal with account allocations and a monthly contribution
- **THEN** the system stores the allocations, contribution, return, and inflation assumptions with the goal

#### Scenario: Create a manually funded goal
- **WHEN** a user selects manual funding and enters a current amount
- **THEN** the system uses that amount for progress and ignores account allocations

#### Scenario: Legacy goal without funding
- **WHEN** an existing goal has no allocation, manual amount, or contribution
- **THEN** the system preserves the goal and reports why its trajectory is unavailable

### Requirement: Goal kinds
The system SHALL calculate savings, purchase, debt payoff, and income goals using kind-specific projections while preserving the common target date, currency, and status model.

#### Scenario: Savings projection
- **WHEN** a savings goal has a current amount, monthly contribution, return, inflation, target amount, and target date
- **THEN** the system projects the accumulated value and compares it with the target

#### Scenario: Purchase projection
- **WHEN** a purchase goal has a purchase price and down-payment percentage
- **THEN** the system uses the down-payment cash requirement as the savings target and reports the purchase price and financed amount

#### Scenario: Debt payoff projection
- **WHEN** a debt goal has a balance, amount already paid, monthly payment, interest rate, and target date
- **THEN** the system projects the remaining balance and reports the payment required to clear it by the target date

#### Scenario: Income projection
- **WHEN** an income goal has current monthly income, additional monthly income, growth, target monthly income, and target date
- **THEN** the system projects monthly income and reports the required income increase

### Requirement: Funding allocation validation
The system SHALL prevent allocations from assigning more than 100% of any account across goals and SHALL allow a goal to share an account with another goal through percentages.

#### Scenario: Shared account
- **WHEN** two goals allocate 40% and 60% of the same account
- **THEN** both allocations are accepted and each goal uses its share of the account value

#### Scenario: Over-allocation
- **WHEN** a new allocation would exceed 100% of an account
- **THEN** the system rejects the allocation with a validation error

### Requirement: Base-currency trajectory
The system SHALL calculate goal trajectories in the base currency, converting account values and targets using the active exchange rate on the calculation date, and SHALL return the rate date used for the conversion.

#### Scenario: Multi-currency goal
- **WHEN** a goal is funded by an account in a different currency from the base currency
- **THEN** the system converts the funded value to the base currency and reports the rate date

#### Scenario: Plan status rate date
- **WHEN** an authenticated client requests plan status
- **THEN** the response includes the rate date used for every converted goal value

### Requirement: Inflation-aware projection
The system SHALL project a goal's future value using the real return derived from the expected nominal return and inflation, including the current funded amount and planned monthly contributions.

#### Scenario: Projected value
- **WHEN** a goal has a funded amount, monthly contribution, real return, and target date
- **THEN** the system returns the projected value at the target date

#### Scenario: Zero return
- **WHEN** the real return is zero
- **THEN** the projection equals the current amount plus monthly contributions multiplied by the number of months

### Requirement: Required contribution
The system SHALL compute the monthly contribution required to reach the target by the target date under the base return assumption, and SHALL return zero when the projected value already meets the target.

#### Scenario: Funding gap
- **WHEN** the base projection is below the target
- **THEN** the system reports the monthly contribution needed to close the gap

#### Scenario: Already funded
- **WHEN** the base projection meets or exceeds the target
- **THEN** the required contribution is zero

### Requirement: Goal status
The system SHALL assign each goal one of `on_track`, `at_risk`, `off_track`, or `insufficient_data`, and SHALL return the reason for the status.

#### Scenario: Conservative case succeeds
- **WHEN** the conservative projection meets the target
- **THEN** the goal status is `on_track`

#### Scenario: Only base case succeeds
- **WHEN** the conservative projection misses but the base projection meets the target
- **THEN** the goal status is `at_risk`

#### Scenario: Base case misses
- **WHEN** the base projection misses the target
- **THEN** the goal status is `off_track`

#### Scenario: Missing target date
- **WHEN** a goal has no target date
- **THEN** the goal status is `insufficient_data` with a missing-date reason

### Requirement: Confidence range
The system SHALL return conservative, base, and optimistic projected values using the configured return assumption and a documented uncertainty band.

#### Scenario: Range returned
- **WHEN** a trajectory is calculated
- **THEN** the response includes all three projected values and the assumptions that produced them

### Requirement: Plan-status read model
The system SHALL expose an authenticated read-only plan-status representation containing the as-of date, base currency, canonical net worth, assumptions, and each goal's trajectory and status.

#### Scenario: Read plan status
- **WHEN** an authenticated client requests plan status
- **THEN** the system returns the current plan summary without mutating financial data

#### Scenario: Empty plan
- **WHEN** no goals exist
- **THEN** the system returns an empty goals collection and the current net worth

### Requirement: Insufficient data handling
The system SHALL NOT report a goal as on track when the inputs required for a trajectory are missing or invalid.

#### Scenario: Missing contribution assumptions
- **WHEN** a goal has a target date but no usable funding amount or return assumption
- **THEN** the system returns `insufficient_data` instead of a positive status

### Requirement: Goal pledges
The system SHALL store a dated pledge to contribute an amount to a goal by a due date, with an open, fulfilled, or expired status.

#### Scenario: Open pledge
- **WHEN** a pledge is created with a future due date
- **THEN** it is open and included in the goal's projected funding until its due date

#### Scenario: Expired pledge
- **WHEN** a pledge's due date passes without being fulfilled
- **THEN** it is marked expired and excluded from projection

### Requirement: Withdrawal detection
The system SHALL flag a withdrawal from a goal when money moves out of a goal-linked account to an account outside the goal.

#### Scenario: Withdrawal flagged
- **WHEN** a transfer leaves a goal-linked account for an outside account
- **THEN** the goal shows a withdrawal warning with the amount

#### Scenario: Internal reallocation ignored
- **WHEN** a transfer moves between two accounts that both fund the same goal
- **THEN** it is not flagged as a withdrawal
