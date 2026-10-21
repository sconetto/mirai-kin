# Theming

## Purpose

Provide light, dark, and system themes with consistent design tokens, no-flash rendering, and theme-aware charts.

## Requirements

### Requirement: Theme modes
The system SHALL support light, dark, and system themes. The selected theme SHALL persist across sessions and routes.

#### Scenario: Select dark theme
- **WHEN** a signed-in user selects the dark theme
- **THEN** the interface renders with the dark palette and the choice is persisted

#### Scenario: Select light theme
- **WHEN** a user selects the light theme
- **THEN** the interface renders with the light palette

#### Scenario: System theme
- **WHEN** a user selects the system theme
- **THEN** the interface follows the operating-system color-scheme preference

### Requirement: Theme-aware tokens
The system SHALL express surfaces, text, borders, accents, status colors, forms, tables, cards, and charts through theme tokens so the full interface adapts to the active theme.

#### Scenario: Dark surface coverage
- **WHEN** the dark theme is active
- **THEN** pages, cards, tables, forms, navigation, badges, and dialogs use dark surfaces and readable foreground colors

#### Scenario: Light surface coverage
- **WHEN** the light theme is active
- **THEN** the same surfaces use the light palette without layout changes

### Requirement: No-flash initial render
The system SHALL apply the persisted theme before first paint and SHALL avoid a flash of the wrong theme.

#### Scenario: Reload in dark mode
- **WHEN** a user reloads a page while the dark theme is selected
- **THEN** the first rendered frame uses the dark theme and `color-scheme: dark`

#### Scenario: System preference at startup
- **WHEN** the system theme is selected and the operating system prefers dark
- **THEN** the first rendered frame uses the dark palette

### Requirement: Live system preference
The system SHALL react to operating-system color-scheme changes while the system theme is selected, without requiring a reload.

#### Scenario: OS switches to dark
- **WHEN** the system theme is active and the operating system switches to dark
- **THEN** the interface updates to the dark palette immediately

### Requirement: Theme control
The system SHALL provide an accessible theme control in the application shell and the appearance settings section, and the control SHALL reflect the active selection.

#### Scenario: Toggle from the shell
- **WHEN** a user changes the theme from the shell control
- **THEN** the interface updates immediately and the new selection is persisted

#### Scenario: Appearance settings
- **WHEN** a user opens Settings → Appearance
- **THEN** light, dark, and system options are presented with the current selection indicated

### Requirement: Theme-aware charts
The system SHALL render charts with theme-aware grids, axes, tooltips, and series colors.

#### Scenario: Dark chart
- **WHEN** a chart is rendered in the dark theme
- **THEN** its grid, labels, tooltip, and series remain readable against the dark surface
