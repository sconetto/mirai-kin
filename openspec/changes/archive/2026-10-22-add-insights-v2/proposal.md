## Why

Insights currently cover savings rate, budgets, category spikes, cash-flow risk, and goal risk, but miss several high-value, deterministic observations that a plan-first user expects: idle cash, net-worth milestones, spending anomalies, and a subscription audit.

## What Changes

- Add four new insight generators: idle cash, net-worth milestone, spending anomaly, and subscription audit.
- Extend the insight coverage requirement and localized rendering for the new types.
- Keep all new generators deterministic and LLM-free.

## Capabilities

### Modified Capabilities

- `insights`: expanded deterministic coverage and new insight types.

## Impact

- **Services**: four new generator functions plus their thresholds.
- **Data**: subscription audit depends on the new subscriptions entity (`add-entities`).
- **UI**: localized text and actions for the new types.
- **Tests**: generator thresholds, actions, and insufficient-data handling.
