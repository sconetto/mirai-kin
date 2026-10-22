## ADDED Requirements

### Requirement: Dedicated entity screens
The system SHALL provide a dedicated screen for each of loans, properties, vehicles, credit cards, subscriptions, and bills.

#### Scenario: View a loan
- **WHEN** a user opens a loan
- **THEN** the system shows its balance, rate, term, monthly payment, and payoff date

#### Scenario: View a subscription
- **WHEN** a user opens a subscription
- **THEN** the system shows its amount, frequency, and next due date

### Requirement: Read-only transactions
The system SHALL treat entity screens as read-only with respect to transactions and SHALL NOT create transactions from entity screens.

#### Scenario: No transaction creation
- **WHEN** a user interacts with an entity screen
- **THEN** there is no action that writes a transaction

### Requirement: Imported-data linking
The system SHALL link entities to imported accounts and transactions where applicable.

#### Scenario: Credit card linked to account
- **WHEN** a credit card entity is linked to an imported account
- **THEN** the entity reflects that account's balance and transactions

### Requirement: Derived figures
The system SHALL compute entity-specific derived figures from stored assumptions.

#### Scenario: Payoff date
- **WHEN** a loan has a balance, rate, and payment
- **THEN** the system reports the projected payoff date
