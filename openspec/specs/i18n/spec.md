# i18n

## Purpose

Serve the product in English (US) and Portuguese (Brazil).

## Requirements

### Requirement: Supported locales
The system SHALL support English (United States) and Portuguese (Brazil) locales, with Portuguese (Brazil) as the default.

#### Scenario: Default locale
- **WHEN** a request does not specify a locale
- **THEN** the system serves Portuguese (Brazil)

### Requirement: Locale routing
The system SHALL expose each locale at its own URL segment (e.g., `/en` and `/pt-BR`).

#### Scenario: Locale-specific route
- **WHEN** a user navigates to `/pt-BR`
- **THEN** the system renders the interface in Portuguese (Brazil)

#### Scenario: English route
- **WHEN** a user navigates to `/en`
- **THEN** the system renders the interface in English (US)

### Requirement: Full UI coverage
The system SHALL translate all user-facing UI strings, including navigation, forms, tables, charts labels, and error messages, in both locales.

#### Scenario: No missing UI strings
- **WHEN** the interface is rendered in either locale
- **THEN** every visible label is in the active locale with no untranslated fallback keys

### Requirement: Locale-aware formatting
The system SHALL format dates, numbers, and currency amounts using the active locale's conventions.

#### Scenario: Currency formatting
- **WHEN** an amount is displayed in Portuguese (Brazil)
- **THEN** the amount is formatted with Brazilian number and currency conventions (e.g., `R$ 1.234,56`)

#### Scenario: Date formatting
- **WHEN** a date is displayed in English (US)
- **THEN** the date is formatted with US conventions (e.g., `MM/DD/YYYY`)
