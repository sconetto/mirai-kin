## MODIFIED Requirements

### Requirement: Composition
The system SHALL break net worth down by asset class — cash/savings, financial investments, real estate, vehicles, other assets, and liabilities — and by currency. Each component SHALL expose its asset class and its configured or default annual growth rate for use by projections.

#### Scenario: Composition breakdown
- **WHEN** the user views the composition
- **THEN** assets and liabilities are grouped by asset class with base-currency values

#### Scenario: Vehicle assets
- **WHEN** an account has `assetSubtype=vehicle`
- **THEN** its value is grouped under vehicles rather than investments

#### Scenario: Real-estate assets
- **WHEN** an account or manual asset is classified as real estate
- **THEN** its value is grouped under real estate

#### Scenario: Investment positions
- **WHEN** an investment account has recorded positions
- **THEN** the positions are grouped under financial investments and the account balance is not double-counted

#### Scenario: Growth-rate override
- **WHEN** an account has an explicit growth rate
- **THEN** that rate overrides the asset-class default for projection purposes

#### Scenario: Liabilities
- **WHEN** credit-card, loan, or mortgage accounts exist
- **THEN** their balances are grouped under liabilities
