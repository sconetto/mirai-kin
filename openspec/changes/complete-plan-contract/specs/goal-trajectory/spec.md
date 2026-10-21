## MODIFIED Requirements

### Requirement: Base-currency trajectory
The system SHALL calculate goal trajectories in the base currency, converting account values and targets using the active exchange rate on the calculation date, and SHALL return the rate date used for the conversion.

#### Scenario: Multi-currency goal
- **WHEN** a goal is funded by an account in a different currency from the base currency
- **THEN** the system converts the funded value to the base currency and reports the rate date

#### Scenario: Plan status rate date
- **WHEN** an authenticated client requests plan status
- **THEN** the response includes the rate date used for every converted goal value
