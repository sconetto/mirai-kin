## Why

Goals track current funding and planned monthly contributions, but they cannot capture a dated promise to add money later, nor flag when money actually leaves a funded goal. These two gaps make goal progress feel static and miss real-world funding behavior.

## What Changes

- Add goal pledges: a dated commitment to contribute an amount by a date, with an expiry and status.
- Add withdrawal detection: flag when a funded goal's linked account loses money.
- Reflect pledges and withdrawals in goal status and the planner/dashboard goal views.

## Capabilities

### Modified Capabilities

- `goal-trajectory`: goal funding now includes pledges and withdrawal detection.
- `financial-planner`: the goal model surfaces pledge and withdrawal information.

## Impact

- **Schema**: a `goal_pledges` table (or fields) with a migration.
- **Services**: pledge lifecycle, expiry evaluation, and withdrawal detection.
- **UI**: pledge management and withdrawal warnings in the planner.
- **Tests**: pledge expiry, status transitions, and withdrawal detection.
