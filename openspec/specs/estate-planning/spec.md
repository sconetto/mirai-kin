# Estate Planning

## Purpose

Inventory assets, liabilities, beneficiaries, and documents without providing legal advice.

## Requirements

### Requirement: Asset and liability inventory
The system SHALL provide an inventory of assets and liabilities (accounts, investments, property, loans) with values in the base currency.

#### Scenario: Inventory
- **WHEN** the user opens estate planning
- **THEN** the system lists assets and liabilities with their values

### Requirement: Beneficiaries
The system SHALL record beneficiaries with name, relationship, intended share, and notes.

#### Scenario: Add a beneficiary
- **WHEN** a user adds a beneficiary
- **THEN** the system stores it and displays the total allocated share

#### Scenario: Shares do not total 100%
- **WHEN** beneficiary shares do not total 100 percent
- **THEN** the system warns the user without blocking the change

### Requirement: Document checklist
The system SHALL provide a document checklist (will, power of attorney, insurance, and other items) with a status per item.

#### Scenario: Update checklist
- **WHEN** a user marks a document as complete
- **THEN** the checklist reflects the new status

### Requirement: Notes
The system SHALL allow free-form notes attached to the estate plan.

#### Scenario: Save a note
- **WHEN** a user writes a note
- **THEN** it is saved with the plan

### Requirement: Export
The system SHALL export the estate inventory and beneficiary list to CSV.

#### Scenario: Estate export
- **WHEN** the user exports the estate plan
- **THEN** a CSV containing the inventory and beneficiaries is downloaded

### Requirement: Privacy and disclaimer
The system SHALL keep estate data local to the server and SHALL state that it does not provide legal advice or legal documents.

#### Scenario: Disclaimer
- **WHEN** the user opens estate planning
- **THEN** a notice states that the app does not provide legal advice
