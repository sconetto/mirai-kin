# Onboarding

## Purpose

Guide the first run through base currency, first import, first goal, and the plan-first/import-only model, then remember completion.

## Requirements

### Requirement: Guided first run
The system SHALL present a first-run onboarding flow covering base currency, first import, first goal, and an explanation.

#### Scenario: New user
- **WHEN** a user logs in and has not completed onboarding
- **THEN** the system redirects them to the onboarding flow

#### Scenario: Complete flow
- **WHEN** the user finishes the final step
- **THEN** the system marks onboarding complete and returns them to the dashboard

### Requirement: Completion persistence
The system SHALL persist onboarding completion so the flow does not repeat on subsequent logins.

#### Scenario: Revisit
- **WHEN** onboarding is complete
- **THEN** the user can reopen it from settings without being forced through it again

### Requirement: Optional steps
The system SHALL allow the user to skip steps whose underlying feature is optional.

#### Scenario: Skip import
- **WHEN** a user skips the import step
- **THEN** onboarding continues and the app remains usable with no imported transactions

### Requirement: Plan-first explanation
The system SHALL explain the plan-first layout and the import-only transaction rule during onboarding.

#### Scenario: Import-only reminder
- **WHEN** the explanation step is shown
- **THEN** it states that transactions are imported, not created
