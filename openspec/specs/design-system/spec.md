# Design System

## Purpose

Keep a single design-token source with light and dark parity, and generate the CSS variables consumed by the application.

## Requirements

### Requirement: Token source of truth
The system SHALL store design tokens in a single design-token JSON document and generate the CSS variables consumed by the application from that document.

#### Scenario: Single source
- **WHEN** a color, spacing, radius, or shadow token changes
- **THEN** the change is made once in the token JSON and regenerated CSS reflects it

### Requirement: Dark and light parity
The system SHALL define light and dark values for a token together and SHALL emit both into the corresponding `:root` and `html[data-theme="dark"]` blocks.

#### Scenario: Dark value defined beside light value
- **WHEN** a token has a light value
- **THEN** its dark value is declared on the same token entry

### Requirement: Build pipeline
The system SHALL provide a deterministic command that regenerates token CSS without manual edits to the generated file.

#### Scenario: Regenerate tokens
- **WHEN** an operator runs the token build command
- **THEN** the generated CSS is rewritten from the token JSON

### Requirement: Backward-compatible variable names
The system SHALL keep the generated CSS variable names stable so existing component references continue to resolve.

#### Scenario: Existing references resolve
- **WHEN** the token build runs
- **THEN** components referencing `var(--ink)`, `var(--surface)`, and `var(--chart-*)` keep working
