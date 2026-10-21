# Investments

## Purpose

Track investment positions, prices, and portfolio growth.

## Requirements

### Requirement: Position management
The system SHALL allow creating, reading, updating, and closing investment positions, each with an account, symbol, name, instrument type, quantity, average cost, and currency.

#### Scenario: Create position
- **WHEN** a user creates an investment position with quantity and average cost
- **THEN** the system stores it linked to an investment account

#### Scenario: Instrument types
- **WHEN** a position is created
- **THEN** its instrument type is one of stock, etf, fund, bond, or crypto

### Requirement: Price history
The system SHALL store dated price observations per position and SHALL use them to value the position.

#### Scenario: Record price
- **WHEN** a price is recorded for a position on a date
- **THEN** the system stores it and uses the latest price to compute current value

### Requirement: Growth tracking
The system SHALL compute each position's market value, cost basis, and growth (gain/loss, absolute and percentage) from quantity, average cost, and latest price.

#### Scenario: Gain computed
- **WHEN** the latest price exceeds the average cost
- **THEN** the system reports a positive absolute and percentage gain

#### Scenario: Multi-currency positions
- **WHEN** positions are held in different currencies
- **THEN** the system reports value in the position's currency and a base-currency snapshot using the active rate
