# Settings

## Purpose

Store validated application preferences and apply them without environment changes while keeping secrets in the environment.

## Requirements

### Requirement: Settings storage
The system SHALL store application settings as validated key/value entries and SHALL apply them without requiring an environment change.

#### Scenario: Update a setting
- **WHEN** a user saves a valid setting
- **THEN** the system persists it and applies it to subsequent requests

### Requirement: General and localization settings
The system SHALL allow configuring base currency, timezone, first day of month, and default locale.

#### Scenario: Change base currency
- **WHEN** a user changes the base currency
- **THEN** new reports and conversions use the new base currency

#### Scenario: Timezone
- **WHEN** a user sets an IANA timezone
- **THEN** "today" and display dates use that timezone while stored timestamps remain UTC

### Requirement: Appearance
The system SHALL allow selecting a light or system theme.

#### Scenario: System theme
- **WHEN** a user selects the system theme
- **THEN** the interface follows the operating-system preference

### Requirement: FX provider
The system SHALL allow selecting the configured FX provider and SHALL validate it before saving.

#### Scenario: Invalid provider
- **WHEN** a user saves a provider the server cannot reach
- **THEN** the system rejects the setting with a clear error

### Requirement: Assistant configuration
The system SHALL allow enabling the assistant and configuring its provider, model, and base URL, while keeping credentials in environment variables.

#### Scenario: Assistant disabled
- **WHEN** the assistant is disabled in settings
- **THEN** the assistant entry point is unavailable and no external calls are made

### Requirement: Data and backup preferences
The system SHALL allow configuring backup enablement, schedule, and retention.

#### Scenario: Backup schedule
- **WHEN** a user enables backups with a daily schedule
- **THEN** the backup job runs on that schedule

### Requirement: Validation
The system SHALL validate settings (ISO currency, IANA timezone, day 1–31, theme enum, cron schedule) and SHALL reject invalid values.

#### Scenario: Invalid value
- **WHEN** a user submits an invalid currency or timezone
- **THEN** the system rejects the change and leaves the previous value in place

### Requirement: Secrets are not exposed
The system SHALL NOT store secrets (database URL, API token, assistant key) in the settings table and SHALL render them only as configured/not-configured status.

#### Scenario: Secret status
- **WHEN** a user opens settings
- **THEN** secrets are shown as configured or not configured, never as values
